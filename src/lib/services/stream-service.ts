import { AIService } from './ai-service';
import { GenerateRoastRequest, RoastMessage, StreamEvent } from '@/types';
import {
  generateUserRound1Prompt,
  generateControllerRound1Prompt,
  generateRound2Prompt,
} from '../prompts/user-prompts';
import { getControllerAIs } from '../prompts/host-prompts';
import { getPersonaById } from '../prompts/persona-prompts';

interface BaseAIService {
  generateStream(systemPrompt: string, userPrompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string>;
  generate(systemPrompt: string, userPrompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}

export class StreamService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * 获取AI服务的流式生成方法
   */
  private getProviderService(): BaseAIService {
    return this.aiService.getProviderService();
  }

  /**
   * 清理生成内容
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\n+/g, ' ')
      .substring(0, 200);
  }

  /**
   * 获取保底内容
   */
  private getFallbackContent(role: string): string {
    const fallbacks: Record<string, string[]> = {
      user: ['说真的，这事儿大家都懂但没人说出来'],
      meme: ['家人们谁懂啊，这波操作真的绝了！'],
      roast: ['本质上就是这样，大家心知肚明'],
      judge: ['本人建议：直接翻篇'],
    };
    return fallbacks[role]?.[0] || '这事儿大家都懂';
  }

  /**
   * 创建SSE流
   */
  async *createRoastStream(request: GenerateRoastRequest): AsyncGenerator<StreamEvent> {
    const { topic, userAgent, userPersona } = request;
    const controllerAIs = getControllerAIs();
    const persona = userPersona ?? getPersonaById('toxic')!;

    // 发送会话ID
    const sessionId = `roast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    yield { type: 'open', data: { sessionId } };

    // 发送用户AI信息
    yield {
      type: 'user_agent_info',
      data: {
        userAgent: request.userAgent,
        userPersona: request.userPersona,
      },
    };

    try {
      const aiService = this.getProviderService();

      // === 第一轮 ===
      yield { type: 'round_start', data: { round: 1 } };

      // 1. 用户AI
      yield { type: 'message_start', data: { role: userAgent.displayName, isUser: true } };
      const userPrompt1 = generateUserRound1Prompt(
        userAgent,
        persona,
        topic,
        controllerAIs.map((ai) => ai.name)
      );
      let userContent1 = '';
      try {
        for await (const token of aiService.generateStream('', userPrompt1, { temperature: 0.9 })) {
          userContent1 += token;
          yield { type: 'token', data: { content: token, role: userAgent.displayName, isUser: true } };
        }
      } catch (error) {
        console.error('User AI stream error, using fallback:', error);
        userContent1 = this.getFallbackContent('user');
        yield { type: 'token', data: { content: userContent1, role: userAgent.displayName, isUser: true } };
      }
      yield { type: 'message_complete', data: { role: userAgent.displayName, content: this.cleanContent(userContent1), isUser: true } };

      // 2. 热梗王
      const memeKing = controllerAIs[0];
      yield { type: 'message_start', data: { role: memeKing.name } };
      const memePrompt = generateControllerRound1Prompt(
        memeKing,
        topic,
        userContent1
      );
      let memeContent = '';
      try {
        for await (const token of aiService.generateStream(memePrompt, topic, { temperature: memeKing.temperature })) {
          memeContent += token;
          yield { type: 'token', data: { content: token, role: memeKing.name } };
        }
      } catch (error) {
        console.error('Meme King stream error, using fallback:', error);
        memeContent = this.getFallbackContent('meme');
        yield { type: 'token', data: { content: memeContent, role: memeKing.name } };
      }
      yield { type: 'message_complete', data: { role: memeKing.name, content: this.cleanContent(memeContent) } };

      // 3. 吐槽大师
      const roastMaster = controllerAIs[1];
      yield { type: 'message_start', data: { role: roastMaster.name } };
      const roastPrompt = generateControllerRound1Prompt(
        roastMaster,
        topic,
        userContent1,
        [userContent1, memeContent]
      );
      let roastContent = '';
      try {
        for await (const token of aiService.generateStream(roastPrompt, topic, { temperature: roastMaster.temperature })) {
          roastContent += token;
          yield { type: 'token', data: { content: token, role: roastMaster.name } };
        }
      } catch (error) {
        console.error('Roast Master stream error, using fallback:', error);
        roastContent = this.getFallbackContent('roast');
        yield { type: 'token', data: { content: roastContent, role: roastMaster.name } };
      }
      yield { type: 'message_complete', data: { role: roastMaster.name, content: this.cleanContent(roastContent) } };

      // 4. 冷面评委
      const judge = controllerAIs[2];
      yield { type: 'message_start', data: { role: judge.name } };
      const judgePrompt = generateControllerRound1Prompt(
        judge,
        topic,
        userContent1,
        [userContent1, memeContent, roastContent]
      );
      let judgeContent = '';
      try {
        for await (const token of aiService.generateStream(judgePrompt, topic, { temperature: judge.temperature })) {
          judgeContent += token;
          yield { type: 'token', data: { content: token, role: judge.name } };
        }
      } catch (error) {
        console.error('Judge stream error, using fallback:', error);
        judgeContent = this.getFallbackContent('judge');
        yield { type: 'token', data: { content: judgeContent, role: judge.name } };
      }
      yield { type: 'message_complete', data: { role: judge.name, content: this.cleanContent(judgeContent) } };

      yield { type: 'round_end', data: { round: 1 } };

      const round1Contents: RoastMessage[] = [
        { role: userAgent.displayName, content: this.cleanContent(userContent1), isUser: true },
        { role: memeKing.name, content: this.cleanContent(memeContent), isUser: false },
        { role: roastMaster.name, content: this.cleanContent(roastContent), isUser: false },
        { role: judge.name, content: this.cleanContent(judgeContent), isUser: false },
      ];

      // === 第二轮 ===
      yield { type: 'round_start', data: { round: 2 } };

      const round2Order = [
        { name: memeKing.name, role: 'meme' },
        { name: userAgent.displayName, role: 'user', isUser: true },
        { name: roastMaster.name, role: 'roast' },
        { name: judge.name, role: 'judge' },
      ];

      const round2Contents: RoastMessage[] = [];

      for (const ai of round2Order) {
        yield { type: 'message_start', data: { role: ai.name, isUser: ai.isUser } };
        const round2Prompt = generateRound2Prompt(
          ai.name,
          ai.role,
          userAgent.displayName,
          persona.name,
          round1Contents
        );

        let content = '';
        try {
          for await (const token of aiService.generateStream('', round2Prompt, { temperature: 0.85 })) {
            content += token;
            yield { type: 'token', data: { content: token, role: ai.name, isUser: ai.isUser } };
          }
        } catch (error) {
          console.error(`${ai.name} stream error, using fallback:`, error);
          content = this.getFallbackContent(ai.role);
          yield { type: 'token', data: { content: content, role: ai.name, isUser: ai.isUser } };
        }

        content = this.cleanContent(content);
        round2Contents.push({ role: ai.name, content, isUser: ai.isUser ?? false });
        yield { type: 'message_complete', data: { role: ai.name, content, isUser: ai.isUser } };
      }

      yield { type: 'round_end', data: { round: 2 } };

      // 完成
      yield {
        type: 'done',
        data: {
          sessionId,
          round1: round1Contents,
          round2: round2Contents,
          participants: [
            userAgent.displayName,
            ...controllerAIs.map((ai) => ai.name),
          ],
        },
      };
    } catch (error) {
      console.error('Stream generation error:', error);
      yield {
        type: 'error',
        data: {
          code: 5001,
          error: 'AI_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
