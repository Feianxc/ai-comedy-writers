import type {
  CreateShareRequest,
  FrontendStreamEventType,
  GenerateRoastRequest,
  RoastSession,
  StreamEvent,
  Topic,
} from '@/types';

/**
 * SSE事件类型
 */
export type SSEEventType =
  | 'open'
  | 'user_agent_info'
  | 'round_start'
  | 'message_start'
  | 'message_complete'
  | 'start'
  | 'participant'
  | 'token'
  | 'round_end'
  | 'done'
  | 'error';

/**
 * SSE事件数据
 */
export type SSEEvent = StreamEvent;

/**
 * 流式生成选项
 */
export interface StreamRoastOptions {
  signal?: AbortSignal;
  onEvent: (event: SSEEvent) => void;
}

/**
 * API响应包装
 */
interface ApiResponse<T> {
  code: number;
  data: T;
}

class APIClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.timeout = 15000;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      return result.data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 生成吐槽会话（批量）
   */
  async generateRoast(params: GenerateRoastRequest): Promise<RoastSession> {
    return this.request<RoastSession>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 创建分享卡片
   */
  async createShare(sessionId: string, session?: RoastSession): Promise<{
    shareUrl: string;
    shortCode: string;
    imageUrl: string;
    expiresAt: string;
  }> {
    const payload: CreateShareRequest = session
      ? { sessionId, session }
      : { sessionId };

    return this.request('/api/share', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 获取分享内容
   */
  async getShare(id: string): Promise<{
    id: string;
    shortCode: string;
    session: RoastSession;
    creator: {
      displayName: string;
      avatar?: string;
    };
    viewCount: number;
  }> {
    return this.request(`/api/share/${id}`);
  }

  /**
   * 获取话题列表
   */
  async getTopics(params?: {
    category?: string;
    limit?: number;
  }): Promise<{ topics: Topic[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return this.request(`/api/topics${query ? `?${query}` : ''}`);
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<{
    id: string;
    displayName: string;
    avatar?: string;
  } | null> {
    try {
      return await this.request('/api/auth/me');
    } catch {
      return null;
    }
  }

  /**
   * 获取登录URL
   */
  getLoginUrl(): string {
    return '/api/auth/login';
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
  }

  /**
   * 创建SSE流式生成URL
   * @deprecated 使用 streamRoast 代替
   */
  createStreamUrl(params: {
    topic: string;
    userAgent: GenerateRoastRequest['userAgent'];
    userPersona?: GenerateRoastRequest['userPersona'];
  }): string {
    const searchParams = new URLSearchParams();
    searchParams.set('topic', params.topic);
    searchParams.set('userAgent', JSON.stringify(params.userAgent));
    if (params.userPersona) {
      searchParams.set('userPersona', JSON.stringify(params.userPersona));
    }
    return `/api/generate/stream?${searchParams.toString()}`;
  }

  /**
   * 解析SSE事件
   */
  private isStreamEventType(type: string): type is FrontendStreamEventType {
    return [
      'open',
      'user_agent_info',
      'round_start',
      'message_start',
      'token',
      'message_complete',
      'round_end',
      'done',
      'error',
      'start',
      'participant',
    ].includes(type);
  }

  private parseSSEEvent(rawEvent: string): SSEEvent | null {
    let type = 'message';
    const dataLines: string[] = [];

    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) {
        type = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    const dataText = dataLines.join('\n');
    let data: unknown = dataText;

    try {
      data = JSON.parse(dataText);
    } catch {
      // 保持原始字符串
    }

    if (!this.isStreamEventType(type)) {
      return null;
    }

    return {
      type,
      data,
    };
  }

  /**
   * 通过POST发起SSE流式生成
   */
  async streamRoast(
    params: GenerateRoastRequest,
    options: StreamRoastOptions
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(params),
      signal: options.signal,
    });

    if (!response.ok) {
      let message = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as { message?: string; error?: string };
        if (typeof errorBody.message === 'string' && errorBody.message) {
          message = errorBody.message;
        } else if (typeof errorBody.error === 'string' && errorBody.error) {
          message = errorBody.error;
        }
      } catch {
        // 忽略解析错误
      }
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error('Stream response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 标准化换行符并按双换行分割事件
        const normalized = buffer.replace(/\r\n/g, '\n');
        const chunks = normalized.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const event = this.parseSSEEvent(chunk);
          if (!event) continue;

          options.onEvent(event);

          if (event.type === 'done' || event.type === 'error') {
            return;
          }
        }
      }

      // 处理最后一个可能的事件
      const tailEvent = this.parseSSEEvent(buffer.replace(/\r\n/g, '\n'));
      if (tailEvent) {
        options.onEvent(tailEvent);
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const apiClient = new APIClient();
