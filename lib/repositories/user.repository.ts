// lib/repositories/user.repository.ts

import type { User } from '@/types';
import { prisma } from '@/lib/db';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(prisma.user);
  }

  async findBySecondmeUserId(secondmeUserId: string): Promise<User | null> {
    const prisma = this.model as {
      findUnique: (args: { where: { secondmeUserId: string } }) => Promise<unknown>;
    };
    return prisma.findUnique({ where: { secondmeUserId } }) as Promise<User>;
  }

  async createOrUpdate(data: {
    secondmeUserId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    displayName: string;
    bio?: string;
    avatar?: string;
    interests?: string[];
  }): Promise<User> {
    const prisma = this.model as {
      upsert: (args: {
        where: { secondmeUserId: string };
        update: {
          accessToken: string;
          refreshToken: string;
          tokenExpiresAt: Date;
          displayName: string;
          bio?: string | undefined;
          avatar?: string | undefined;
          interests?: string[] | undefined;
          lastLoginAt: Date;
        };
        create: {
          secondmeUserId: string;
          accessToken: string;
          refreshToken: string;
          tokenExpiresAt: Date;
          displayName: string;
          bio?: string | undefined;
          avatar?: string | undefined;
          interests?: string[] | undefined;
          lastLoginAt: Date;
        };
      }) => Promise<unknown>;
    };
    return prisma.upsert({
      where: { secondmeUserId: data.secondmeUserId },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
        interests: data.interests,
        lastLoginAt: new Date(),
      },
      create: {
        ...data,
        lastLoginAt: new Date(),
      },
    }) as Promise<User>;
  }

  async updateTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }
  ): Promise<User> {
    return this.prismaModel.update({
      where: { id: userId },
      data: tokens,
    }) as Promise<User>;
  }

  async findRecentUsers(days: number = 7, limit: number = 50): Promise<User[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prismaModel.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<User[]>;
  }

  async findActiveUsers(hours: number = 24, limit: number = 50): Promise<User[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.prismaModel.findMany({
      where: { lastLoginAt: { gte: since } },
      orderBy: { lastLoginAt: 'desc' },
      take: limit,
    }) as Promise<User[]>;
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prismaModel.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    }) as Promise<User>;
  }
}

export const userRepository = new UserRepository();
