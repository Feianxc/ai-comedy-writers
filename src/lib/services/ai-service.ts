import { OpenAIService } from './openai-service';
import { AnthropicService } from './anthropic-service';
import {
  GenerateRoastRequest,
  RoastSession,
  RoastMessage,
} from '@/types';
import {
  AIError,
  AIServiceError,
} from './types';
import {
  generateUserRound1Prompt,
  generateControllerRound1Prompt,
  generateRound2Prompt,
} from '../prompts/user-prompts';
import { getControllerAIs } from '../prompts/host-prompts';
import { getPersonaById } from '../prompts/persona-prompts';

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

interface BaseAIService {
  generate(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(systemPrompt: string, userPrompt: string, options?: GenerateOptions): AsyncIterable<string>;
  healthCheck(): Promise<boolean>;
}

type ProviderName = 'openai' | 'anthropic';

interface ProviderFallbackInput {
  role: string;
  topic: string;
  systemPrompt: string;
  userPrompt: string;
  options?: GenerateOptions;
}

export class AIService {
  private openai: OpenAIService | null = null;
  private anthropic: AnthropicService | null = null;
  private primaryProvider: ProviderName = 'openai';

  constructor() {
    this.initializeProviders();
  }

  /**
   * 初始化AI Provider
   */
  private initializeProviders(): void {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey) {
      this.openai = new OpenAIService({
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        timeout: 30000,
        maxRetries: 2,
      });
      this.primaryProvider = 'openai';
    }

    if (anthropicKey) {
      this.anthropic = new AnthropicService({
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        timeout: 30000,
        maxRetries: 2,
      });

      if (!this.openai) {
        this.primaryProvider = 'anthropic';
      }
    }
  }

  /**
   * 获取当前可用的AI服务
   */
  private getAIService(): BaseAIService {
    if (this.primaryProvider === 'openai' && this.openai) {
      return this.openai;
    }

    if (this.primaryProvider === 'anthropic' && this.anthropic) {
      return this.anthropic;
    }

    if (this.openai) {
      this.primaryProvider = 'openai';
      return this.openai;
    }

    if (this.anthropic) {
      this.primaryProvider = 'anthropic';
      return this.anthropic;
    }

    throw new AIError(AIServiceError.NO_AI_PROVIDER_AVAILABLE, '没有可用的AI服务');
  }

  /**
   * 获取备用Provider
   */
  private getFallbackProvider():
    | { name: ProviderName; service: BaseAIService }
    | null {
    if (this.primaryProvider === 'openai' && this.anthropic) {
      return { name: 'anthropic', service: this.anthropic };
    }

    if (this.primaryProvider === 'anthropic' && this.openai) {
      return { name: 'openai', service: this.openai };
    }

    return null;
  }

  /**
   * 带Provider降级的生成
   */
  private async generateWithProviderFallback(input: ProviderFallbackInput): Promise<string> {
    const primaryProviderName = this.primaryProvider;
    const primaryService = this.getAIService();

    try {
      return await primaryService.generate(
        input.systemPrompt,
        input.userPrompt,
        input.options
      );
    } catch (primaryError) {
      console.warn(`Primary provider ${primaryProviderName} failed, trying fallback provider`, primaryError);

      const fallbackProvider = this.getFallbackProvider();

      if (fallbackProvider) {
        try {
          const content = await fallbackProvider.service.generate(
            input.systemPrompt,
            input.userPrompt,
            input.options
          );

          this.primaryProvider = fallbackProvider.name;
          return content;
        } catch (fallbackError) {
          console.error(`Fallback provider ${fallbackProvider.name} also failed`, fallbackError);
        }
      }

      return this.getFallbackContent(input.role, input.topic);
    }
  }

  /**
   * 生成完整吐槽会话（非流式）
   */
  async generateRoast(request: GenerateRoastRequest): Promise<RoastSession> {
    const { topic, userAgent, userPersona } = request;
    const controllerAIs = getControllerAIs();

    // 默认人设
    const persona = userPersona ?? getPersonaById('toxic')!;

    // 第一轮生成
    const round1: RoastMessage[] = [];

    // 1. 用户AI发言
    const userPrompt1 = generateUserRound1Prompt(
      userAgent,
      persona,
      topic,
      controllerAIs.map((ai) => ai.name)
    );
    const userContent1 = await this.generateWithProviderFallback({
      role: 'user',
      topic,
      systemPrompt: '',
      userPrompt: userPrompt1,
      options: { temperature: 0.9 },
    });
    round1.push({
      role: userAgent.displayName,
      content: this.cleanContent(userContent1),
      isUser: true,
    });

    // 2. 热梗王发言
    const memeKing = controllerAIs[0];
    const memePrompt = generateControllerRound1Prompt(
      memeKing,
      topic,
      userContent1
    );
    const memeContent = await this.generateWithProviderFallback({
      role: 'meme',
      topic,
      systemPrompt: memePrompt,
      userPrompt: topic,
      options: { temperature: memeKing.temperature },
    });
    round1.push({
      role: memeKing.name,
      content: this.cleanContent(memeContent),
      isUser: false,
    });

    // 3. 吐槽大师发言
    const roastMaster = controllerAIs[1];
    const roastPrompt = generateControllerRound1Prompt(
      roastMaster,
      topic,
      userContent1,
      [userContent1, memeContent]
    );
    const roastContent = await this.generateWithProviderFallback({
      role: 'roast',
      topic,
      systemPrompt: roastPrompt,
      userPrompt: topic,
      options: { temperature: roastMaster.temperature },
    });
    round1.push({
      role: roastMaster.name,
      content: this.cleanContent(roastContent),
      isUser: false,
    });

    // 4. 冷面评委发言
    const judge = controllerAIs[2];
    const judgePrompt = generateControllerRound1Prompt(
      judge,
      topic,
      userContent1,
      [userContent1, memeContent, roastContent]
    );
    const judgeContent = await this.generateWithProviderFallback({
      role: 'judge',
      topic,
      systemPrompt: judgePrompt,
      userPrompt: topic,
      options: { temperature: judge.temperature },
    });
    round1.push({
      role: judge.name,
      content: this.cleanContent(judgeContent),
      isUser: false,
    });

    // 第二轮生成
    const round2: RoastMessage[] = [];

    // 生成顺序：热梗王 -> 用户AI -> 吐槽大师 -> 冷面评委
    const round2Order = [
      { name: memeKing.name, role: 'meme' },
      { name: userAgent.displayName, role: 'user', isUser: true },
      { name: roastMaster.name, role: 'roast' },
      { name: judge.name, role: 'judge' },
    ];

    for (const ai of round2Order) {
      const round2Prompt = generateRound2Prompt(
        ai.name,
        ai.role,
        userAgent.displayName,
        persona.name,
        round1.map((msg) => ({ role: msg.role, content: msg.content }))
      );

      const content = await this.generateWithProviderFallback({
        role: ai.role,
        topic,
        systemPrompt: '',
        userPrompt: round2Prompt,
        options: { temperature: 0.85 },
      });

      round2.push({
        role: ai.name,
        content: this.cleanContent(content),
        isUser: ai.isUser ?? false,
      });
    }

    // 构建会话结果
    return {
      id: `roast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      topic,
      userId: userAgent.id || 'user',
      userAgent,
      userPersona: persona,
      round1,
      round2,
      participants: [
        userAgent.displayName,
        ...controllerAIs.map((ai) => ai.name),
      ],
      createdAt: new Date(),
    };
  }

  /**
   * 清理生成内容
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/^[\"']|[\"']$/g, '')
      .replace(/\n+/g, ' ')
      .substring(0, 200);
  }

  /**
   * 获取保底内容
   */
  private getFallbackContent(role: string, topic: string): string {
    const fallbacks: Record<string, string[]> = {
      user: [
        `说真的，${topic}这事儿，大家都懂但没人说出来`,
        `${topic}？这不就是咱们每天都在经历的事吗`,
      ],
      meme: [
        `家人们谁懂啊，${topic}真的绝了！`,
        `${topic}这波操作我是真的笑死`,
      ],
      roast: [
        `${topic}本质就是这样，大家心知肚明`,
        `这事儿背后的真相，懂的都懂`,
      ],
      judge: [
        `本人建议：${topic}这事儿直接翻篇`,
        `数据说话，${topic}的成功率为零`,
      ],
    };

    const options = fallbacks[role] || fallbacks.user;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const service = this.getAIService();
      return await service.healthCheck();
    } catch {
      return false;
    }
  }

  /**
   * 流式生成内容（供StreamService使用）
   */
  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string, void, unknown> {
    const primaryService = this.getAIService();

    try {
      const stream = primaryService.generateStream(systemPrompt, userPrompt, options);

      for await (const token of stream) {
        yield token;
      }
    } catch (primaryError) {
      console.warn('Primary provider stream failed, trying fallback provider', primaryError);

      const fallbackProvider = this.getFallbackProvider();

      if (fallbackProvider) {
        try {
          const stream = fallbackProvider.service.generateStream(systemPrompt, userPrompt, options);

          for await (const token of stream) {
            yield token;
          }

          this.primaryProvider = fallbackProvider.name;
          return;
        } catch (fallbackError) {
          console.error(`Fallback provider ${fallbackProvider.name} stream also failed`, fallbackError);
        }
      }

      throw primaryError;
    }
  }

  /**
   * 获取当前AI服务实例（供StreamService使用）
   */
  getProviderService(): BaseAIService {
    return this.getAIService();
  }
}
