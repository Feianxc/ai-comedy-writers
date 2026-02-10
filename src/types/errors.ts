// src/types/errors.ts

export enum ErrorCode {
  // 认证错误 401x
  UNAUTHORIZED = 4011,
  INVALID_TOKEN = 4012,
  TOKEN_EXPIRED = 4013,
  INVALID_STATE = 4014,
  OAUTH_FAILED = 4015,
  OAUTH_CODE_EXPIRED = 4016,
  OAUTH_DENIED = 4017,

  // 客户端错误 400x, 404x
  INVALID_REQUEST = 4001,
  INVALID_REDIRECT = 4002,
  INVALID_TOPIC = 4003,
  INVALID_AGENT = 4004,
  MISSING_REQUIRED_FIELD = 4005,
  SHARE_NOT_FOUND = 4041,
  SESSION_NOT_FOUND = 4042,
  USER_NOT_FOUND = 4043,
  TOPIC_NOT_FOUND = 4044,

  // 服务端错误 500x
  AI_GENERATION_FAILED = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_API_ERROR = 5003,
  INTERNAL_ERROR = 5004,
  RATE_LIMIT_EXCEEDED = 5005,
  TOKEN_REFRESH_FAILED = 5006,
}

export interface ErrorDetail {
  code: ErrorCode;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.INVALID_TOKEN]: '无效的令牌',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [ErrorCode.INVALID_STATE]: '无效的状态参数',
  [ErrorCode.OAUTH_FAILED]: 'OAuth认证失败',
  [ErrorCode.OAUTH_CODE_EXPIRED]: '授权码已过期',
  [ErrorCode.OAUTH_DENIED]: '用户拒绝授权',

  [ErrorCode.INVALID_REQUEST]: '无效的请求',
  [ErrorCode.INVALID_REDIRECT]: '不合法的跳转地址',
  [ErrorCode.INVALID_TOPIC]: '话题格式不正确',
  [ErrorCode.INVALID_AGENT]: 'Agent配置无效',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必需字段',
  [ErrorCode.SHARE_NOT_FOUND]: '分享内容不存在或已过期',
  [ErrorCode.SESSION_NOT_FOUND]: '会话不存在',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.TOPIC_NOT_FOUND]: '话题不存在',

  [ErrorCode.AI_GENERATION_FAILED]: 'AI生成失败，请稍后重试',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.EXTERNAL_API_ERROR]: '外部API错误',
  [ErrorCode.INTERNAL_ERROR]: '内部错误',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁',
  [ErrorCode.TOKEN_REFRESH_FAILED]: 'Token刷新失败',
};

export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): ErrorDetail {
  return {
    code,
    error: Object.keys(ErrorCode).find(
      (key) => ErrorCode[key as keyof typeof ErrorCode] === code
    ) || 'UNKNOWN',
    message: message || ERROR_MESSAGES[code],
    ...(details && { details }),
  };
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: Record<string, unknown>
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'AppError';
  }
}
