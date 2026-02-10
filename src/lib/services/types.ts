/**
 * AI Provider配置
 */
export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  timeout: number;
  maxRetries: number;
}

/**
 * 降级响应
 */
export interface FallbackResponse {
  content: string;
  isFallback: true;
  reason: string;
}

/**
 * AI服务错误代码
 */
export enum AIServiceError {
  NO_API_KEY = 'NO_API_KEY',
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONTENT_LENGTH_INVALID = 'CONTENT_LENGTH_INVALID',
  SENSITIVE_CONTENT = 'SENSITIVE_CONTENT',
  DUPLICATE_CONTENT = 'DUPLICATE_CONTENT',
  NO_AI_PROVIDER_AVAILABLE = 'NO_AI_PROVIDER_AVAILABLE',
  GENERATION_FAILED = 'GENERATION_FAILED',
}

/**
 * AI服务错误类
 */
export class AIError extends Error {
  constructor(
    public code: AIServiceError,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// Re-export types from @/types for convenience
export type { StreamEvent, StreamEventType } from '@/types';
