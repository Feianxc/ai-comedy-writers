// src/types/api.ts

import type { RoastMessage, UserAgent } from './index';

// ==================== 认证相关 ====================

export interface LoginRequest {
  redirectUrl?: string;
}

export interface LoginResponse {
  authorizeUrl: string;
}

export interface MeResponse {
  id: string;
  secondmeUserId: string;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  interests: string[];
  createdAt: Date;
}

// ==================== 生成相关 ====================

export interface GenerateRequest {
  topic: string;
  userAgent: UserAgent;
}

export interface GenerateResponse {
  id: string;
  topic: string;
  round1: RoastMessage[];
  round2: RoastMessage[];
  participants: string[];
  createdAt: Date;
}

export interface StreamEvent {
  event: 'open' | 'round1.agent' | 'round1.ai' | 'round2.agent' | 'round2.ai' | 'done' | 'error';
  data: unknown;
}

// ==================== 话题相关 ====================

export interface ListTopicsQuery {
  category?: string;
  isSystem?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListTopicsResponse {
  topics: Array<{
    id: string;
    title: string;
    category: string;
    hot: number;
    isSystem: boolean;
  }>;
}

export interface CreateTopicRequest {
  title: string;
  category: string;
}

export interface CreateTopicResponse {
  id: string;
  title: string;
  category: string;
  hot: number;
  isSystem: boolean;
  createdBy: string | null;
}

// ==================== 分享相关 ====================

export interface CreateShareRequest {
  sessionId: string;
}

export interface CreateShareResponse {
  id: string;
  shareUrl: string;
  shortCode: string;
  imageUrl: string;
  expiresAt: Date | null;
}

export interface GetShareResponse {
  id: string;
  shortCode: string;
  session: {
    id: string;
    topic: string;
    round1: RoastMessage[];
    round2: RoastMessage[];
    participants: string[];
    createdAt: Date;
  };
  creator: {
    displayName: string;
    avatar?: string;
  };
  viewCount: number;
}

// ==================== SSE事件类型 ====================

export interface SSEOpenEvent {
  sessionId: string;
}

export interface SSEMessageEvent {
  content: string;
}

export interface SSEDoneEvent {
  sessionId: string;
  participants: string[];
}

export interface SSEErrorEvent {
  code: number;
  error: string;
}
