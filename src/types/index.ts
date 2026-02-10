// src/types/index.ts

// ==================== 基础类型 ====================

export type Cuid = string;

// ==================== UI组件类型 ====================

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
export type BadgeSize = 'sm' | 'md';

export type InputState = 'default' | 'error' | 'success';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ==================== 用户相关 ====================

export interface User {
  id: Cuid;
  secondmeUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  expiresAt?: Date;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  userAgent?: UserAgent;
}

export interface UserAgent {
  id?: string;
  displayName: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
}

export interface UserAgentConfig {
  displayName: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
  archetype: AIPersonaArchetype;
}

// ==================== AI相关 ====================

export type AIPersonaArchetype =
  | 'toxic'
  | 'sarcastic'
  | 'data'
  | 'meme'
  | 'deadpan';

export interface AIPersona {
  id: string;
  name: string;
  archetype: AIPersonaArchetype;
  style: PersonaStyle;
  signature: string[];
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export interface PersonaStyle {
  tone: string;
  length: 'short' | 'medium' | 'long';
  emoji: boolean;
  meme: boolean;
}

export type Role = 'user_agent' | 'ai_comedian' | 'moderator';

export interface ControllerAI {
  id: string;
  name: string;
  role: 'meme_king' | 'roast_master' | 'deadpan_judge';
  systemPrompt: string;
  temperature: number;
}

export interface RoastMessage {
  role: Role | string;
  content: string;
  mentions?: string[];
  isUser?: boolean;
}

export interface RoastSession {
  id: string;
  topic: string;
  userId: string;
  userAgent: UserAgent;
  userPersona?: AIPersona;
  round1: RoastMessage[];
  round2: RoastMessage[];
  participants: string[];
  createdAt: Date;
  imageUrl?: string;
}

// ==================== 会话相关 ====================

export interface Session {
  id: string;
  userId: string;
  userAgentId: string;
  userAgentConfig: UserAgentConfig;
  topic: string;
  round1: RoastMessage[];
  round2: RoastMessage[];
  participants: string[];
  isPublic: boolean;
  createdAt: Date;
}

// ==================== 话题相关 ====================

export type TopicCategory =
  | 'workplace'
  | 'life'
  | 'tech'
  | 'relationship'
  | 'social'
  | 'custom';

export interface Topic {
  id: Cuid;
  title: string;
  category: string;
  hot: number;
  isSystem: boolean;
  isHot?: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicCategoryInfo {
  id: TopicCategory;
  name: string;
  icon: string;
  description: string;
}

// ==================== 分享相关 ====================

export interface ShareCard {
  id: Cuid;
  sessionId: string;
  userId: string;
  imageUrl: string;
  shareUrl: string;
  shortCode: string;
  viewCount: number;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ShareContent {
  id: Cuid;
  shortCode: string;
  session: RoastSession;
  creator: {
    displayName: string;
    avatar?: string;
  };
  viewCount: number;
}

// ==================== API相关 ====================

export interface ApiResponse<T> {
  code: number;
  data: T;
}

export interface ApiError {
  code: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== 请求类型 ====================

export interface GenerateRoastRequest {
  topic: string;
  userAgent: UserAgent;
  userPersona?: AIPersona;
}

export interface GenerateRoastResponse {
  id: string;
  topic: string;
  round1: RoastMessage[];
  round2: RoastMessage[];
  participants: string[];
  createdAt: Date;
}

export interface CreateTopicRequest {
  title: string;
  category: string;
}

export interface CreateShareRequest {
  sessionId: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

// ==================== SecondMe API类型 ====================

export interface SecondMeTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface SecondMeUserResponse {
  id: string;
  display_name: string;
  bio?: string;
  avatar?: string;
  interests?: string[];
}

export interface SecondMeErrorResponse {
  error: string;
  error_description?: string;
}

// ==================== AI API类型 ====================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// ==================== SSE相关 ====================

export type StreamEventType =
  | 'open'
  | 'user_agent_info'
  | 'round_start'
  | 'message_start'
  | 'token'
  | 'message_complete'
  | 'round_end'
  | 'done'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
}

export interface SSEMessage {
  type: 'user_agent_info' | 'start' | 'token' | 'message_complete' | 'round_end' | 'done' | 'error';
  round?: number;
  role?: string;
  content?: string;
  isUser?: boolean;
  roastId?: string;
  error?: string;
}
