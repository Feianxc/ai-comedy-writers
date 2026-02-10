import OpenAI from 'openai';
import { AIProviderConfig, AIError, AIServiceError } from './types';

export class OpenAIService {
  private client: OpenAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });
  }

  /**
   * 生成内容（非流式）
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.85,
        max_tokens: options?.maxTokens ?? 300,
      });

      return response.choices[0]?.message?.content ?? '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 流式生成
   */
  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.85,
        max_tokens: options?.maxTokens ?? 300,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI Stream Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): AIError {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return new AIError(AIServiceError.RATE_LIMIT_EXCEEDED, '请求过于频繁，请稍后重试', true);
      }
      if (error.status === 401) {
        return new AIError(AIServiceError.INVALID_API_KEY, 'API密钥无效');
      }
      if (error.status && error.status >= 500) {
        return new AIError(AIServiceError.PROVIDER_ERROR, 'AI服务异常，请稍后重试', true);
      }
    }
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new AIError(AIServiceError.TIMEOUT, '请求超时，请稍后重试', true);
      }
    }
    return new AIError(AIServiceError.GENERATION_FAILED, '生成失败，请稍后重试', true);
  }
}
