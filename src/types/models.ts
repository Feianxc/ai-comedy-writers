// src/types/models.ts

// Prisma生成的模型类型（从@prisma/client导入）
// 此文件用于扩展和补充Prisma模型

import type {
  User as PrismaUser,
  Session as PrismaSession,
  Topic as PrismaTopic,
  ShareCard as PrismaShareCard,
  TokenRefreshLog as PrismaTokenRefreshLog,
} from '@prisma/client';

// 导出Prisma基础类型
export type {
  PrismaUser,
  PrismaSession,
  PrismaTopic,
  PrismaShareCard,
  PrismaTokenRefreshLog,
};

// 扩展类型（如果需要添加计算字段）
export interface UserWithRelations extends PrismaUser {
  sessions?: PrismaSession[];
  shareCards?: PrismaShareCard[];
  customTopics?: PrismaTopic[];
  _count?: {
    sessions: number;
    shareCards: number;
  };
}

export interface SessionWithRelations extends PrismaSession {
  user?: PrismaUser;
  shareCards?: PrismaShareCard[];
}

export interface TopicWithRelations extends PrismaTopic {
  creator?: PrismaUser | null;
}

export interface ShareCardWithRelations extends PrismaShareCard {
  session?: PrismaSession;
  user?: PrismaUser;
}
