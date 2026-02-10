// lib/repositories/share-card.repository.ts

import type { ShareCard } from '@/types';
import { prisma } from '@/lib/db';
import { BaseRepository } from './base.repository';

export class ShareCardRepository extends BaseRepository<ShareCard> {
  constructor() {
    super(prisma.shareCard);
  }

  async findByShortCode(shortCode: string): Promise<ShareCard | null> {
    const prisma = this.model as {
      findUnique: (args: {
        where: { shortCode: string };
        include: {
          session: boolean;
          user: { select: { displayName: boolean; avatar: boolean } };
        };
      }) => Promise<unknown>;
    };
    return prisma.findUnique({
      where: { shortCode },
      include: {
        session: true,
        user: {
          select: {
            displayName: true,
            avatar: true,
          },
        },
      },
    }) as Promise<ShareCard>;
  }

  async findByUserId(userId: string, limit: number = 20): Promise<ShareCard[]> {
    return this.prismaModel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<ShareCard[]>;
  }

  async findBySessionId(sessionId: string): Promise<ShareCard[]> {
    return this.prismaModel.findMany({
      where: { sessionId },
    }) as Promise<ShareCard[]>;
  }

  async generateUniqueShortCode(): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const prisma = this.model as {
        findUnique: (args: { where: { shortCode: string } }) => Promise<unknown>;
      };
      const existing = await prisma.findUnique({ where: { shortCode: code } });
      if (!existing) {
        return code;
      }
      attempts++;
    }

    throw new Error('Failed to generate unique short code');
  }

  async createShareCard(data: {
    sessionId: string;
    userId: string;
    imageUrl: string;
    shareUrl: string;
    expiresAt?: Date;
  }): Promise<ShareCard> {
    const shortCode = await this.generateUniqueShortCode();

    return this.prismaModel.create({
      data: {
        ...data,
        shortCode,
      },
    }) as Promise<ShareCard>;
  }

  async incrementViewCount(shortCode: string): Promise<ShareCard> {
    const prisma = this.model as {
      update: (args: {
        where: { shortCode: string };
        data: { viewCount: { increment: number } };
      }) => Promise<unknown>;
    };
    return prisma.update({
      where: { shortCode },
      data: { viewCount: { increment: 1 } },
    }) as Promise<ShareCard>;
  }

  async findExpired(): Promise<ShareCard[]> {
    return this.prismaModel.findMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    }) as Promise<ShareCard[]>;
  }

  async deleteExpired(): Promise<{ count: number }> {
    const prisma = this.model as {
      deleteMany: (args: { where: { expiresAt: { lte: Date } } }) => Promise<{ count: number }>;
    };
    return prisma.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });
  }

  async findByUserIdPaginated(userId: string, skip: number, take: number): Promise<{
    shareCards: ShareCard[];
    total: number;
  }> {
    const [shareCards, total] = await Promise.all([
      this.prismaModel.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prismaModel.count({ where: { userId } }),
    ]);

    return { shareCards: shareCards as ShareCard[], total };
  }
}

export const shareCardRepository = new ShareCardRepository();
