// lib/constants/config.ts

export const CONFIG = {
  // 数据库
  DB: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },

  // AI
  AI: {
    DEFAULT_MODEL: 'gpt-4o-mini',
    DEFAULT_TEMPERATURE: 0.9,
    DEFAULT_MAX_TOKENS: 500,
    TIMEOUT: 30000,
    MAX_RETRIES: 2,
  },

  // Session
  SESSION: {
    COOKIE_NAME: 'session',
    MAX_AGE: 7 * 24 * 60 * 60,
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'lax' as const,
  },

  // OAuth
  OAUTH: {
    STATE_EXPIRY: 5 * 60,
    TOKEN_REFRESH_BUFFER: 5 * 60,
  },

  // 分享卡
  SHARE: {
    SHORT_CODE_LENGTH: 6,
    EXPIRY_DAYS: 30,
    BASE_URL: process.env.CDN_BASE_URL || 'https://cdn.ai-comedy.second.me',
  },

  // 速率限制
  RATE_LIMIT: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_REQUESTS: {
      AUTH: 10,
      GENERATE: 20,
      DEFAULT: 100,
    },
  },

  // 话题
  TOPIC: {
    TITLE_MIN_LENGTH: 5,
    TITLE_MAX_LENGTH: 100,
    CATEGORY_MAX_LENGTH: 50,
    MAX_INTERESTS: 10,
  },

  // 消息
  MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
    ROUNDS: 2,
    MESSAGES_PER_ROUND: 4,
  },
} as const;

// SecondMe OAuth配置
export const SECOND_ME_CONFIG = {
  baseUrl: 'https://api.second.me',
  oauth: {
    clientId: process.env.SECOND_ME_CLIENT_ID || '',
    clientSecret: process.env.SECOND_ME_CLIENT_SECRET || '',
    authorizeUrl: 'https://api.second.me/oauth/authorize',
    tokenUrl: 'https://api.second.me/oauth/token',
  },
  api: {
    userUrl: 'https://api.second.me/v1/user',
  },
} as const;

// AI提供者配置
export const AI_PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
} as const;
