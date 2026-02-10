// lib/constants/errors.ts

export const ERROR_MESSAGES = {
  // 认证
  UNAUTHORIZED: '请先登录',
  INVALID_TOKEN: '无效的令牌',
  TOKEN_EXPIRED: '令牌已过期，请重新登录',
  INVALID_STATE: '无效的状态参数，请重新登录',
  OAUTH_FAILED: 'OAuth认证失败',
  OAUTH_CODE_EXPIRED: '授权码已过期，请重新登录',
  OAUTH_DENIED: '用户拒绝授权',

  // 请求
  INVALID_REQUEST: '无效的请求',
  INVALID_REDIRECT: '不合法的跳转地址',
  INVALID_TOPIC: '话题格式不正确',
  INVALID_AGENT: 'Agent配置无效',
  MISSING_REQUIRED_FIELD: '缺少必需字段',

  // 资源
  SHARE_NOT_FOUND: '分享内容不存在或已过期',
  SESSION_NOT_FOUND: '会话不存在',
  USER_NOT_FOUND: '用户不存在',
  TOPIC_NOT_FOUND: '话题不存在',

  // 服务
  AI_GENERATION_FAILED: 'AI生成失败，请稍后重试',
  DATABASE_ERROR: '数据库错误',
  EXTERNAL_API_ERROR: '外部API错误',
  INTERNAL_ERROR: '内部错误',
  RATE_LIMIT_EXCEEDED: '请求过于频繁，请稍后再试',
  TOKEN_REFRESH_FAILED: 'Token刷新失败，请重新登录',
} as const;
