// lib/validations/schema.ts

import { z } from 'zod';

// ==================== 基础Schema ====================

export const cuidSchema = z.string().cuid();

export const userAgentSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(200).optional(),
  interests: z.array(z.string()).max(10).optional(),
  avatar: z.string().url().optional(),
});

export const roastMessageSchema = z.object({
  role: z.enum(['user_agent', 'ai_comedian', 'moderator']),
  content: z.string().min(1).max(1000),
  mentions: z.array(z.string()).optional(),
  isUser: z.boolean(),
});

// ==================== 请求Schema ====================

export const generateRoastSchema = z.object({
  topic: z.string().min(5).max(200),
  userAgent: userAgentSchema,
});

export const createTopicSchema = z.object({
  title: z.string().min(5).max(100),
  category: z.string().min(1).max(50),
});

export const createShareSchema = z.object({
  sessionId: cuidSchema,
});

export const updateTopicSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
});

export const listTopicsSchema = z.object({
  category: z.string().optional(),
  isSystem: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const listSessionsSchema = z.object({
  isPublic: z.boolean().optional(),
  userId: cuidSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const loginRequestSchema = z.object({
  redirectUrl: z.string().url().optional(),
});

export const getShareSchema = z.object({
  shortCode: z.string().min(6).max(10),
});

// ==================== 响应Schema ====================

export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    code: z.number(),
    data: dataSchema,
  });

export const apiErrorSchema = z.object({
  code: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// ==================== SecondMe相关Schema ====================

export const secondMeTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('Bearer'),
});

export const secondMeUserResponseSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

export const secondMeErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

// ==================== OAuth相关Schema ====================

export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// ==================== 类型导出 ====================

export type GenerateRoastInput = z.infer<typeof generateRoastSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type ListTopicsInput = z.infer<typeof listTopicsSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export type UserAgentInput = z.infer<typeof userAgentSchema>;
export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type GetShareInput = z.infer<typeof getShareSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type SecondMeTokenResponseInput = z.infer<typeof secondMeTokenResponseSchema>;
export type SecondMeUserResponseInput = z.infer<typeof secondMeUserResponseSchema>;
