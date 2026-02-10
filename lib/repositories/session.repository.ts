// lib/repositories/session.repository.ts

import type { Session } from '@/types';
import { prisma } from '@/lib/db';
import { BaseRepository } from './base.repository';

export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super(prisma.session);
  }

  async findByUserId(userId: string, limit: number = 20): Promise<Session[]> {
    return this.prismaModel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<Session[]>;
  }

  async findPublicSessions(limit: number = 50, skip: number = 0): Promise<Session[]> {
    return this.prismaModel.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }) as Promise<Session[]>;
  }

  async findByTopic(keyword: string, limit: number = 20): Promise<Session[]> {
    return this.prismaModel.findMany({
      where: { topic: { contains: keyword, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<Session[]>;
  }

  async createSession(data: {
    userId: string;
    topic: string;
    userAgentId: string;
    userAgentConfig: Record<string, unknown>;
    round1: unknown[];
    round2: unknown[];
    participants: string[];
    isPublic?: boolean;
  }): Promise<Session> {
    return this.prismaModel.create({
      data,
    }) as Promise<Session>;
  }

  async updateRounds(
    sessionId: string,
    rounds: { round1: unknown[]; round2: unknown[] }
  ): Promise<Session> {
    return this.prismaModel.update({
      where: { id: sessionId },
      data: rounds,
    }) as Promise<Session>;
  }

  async setPublic(sessionId: string, isPublic: boolean): Promise<Session> {
    return this.prismaModel.update({
      where: { id: sessionId },
      data: { isPublic },
    }) as Promise<Session>;
  }

  async findWithUser(sessionId: string): Promise<Session | null> {
    const prisma = this.model as {
      findUnique: (args: {
        where: { id: string };
        include: { user: { select: { id: true; displayName: true; avatar: true } } };
      }) => Promise<unknown>;
    };
    return prisma.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    }) as Promise<Session>;
  }

  async findByUserIdPaginated(userId: string, skip: number, take: number): Promise<{
    sessions: Session[];
    total: number;
  }> {
    const [sessions, total] = await Promise.all([
      this.prismaModel.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prismaModel.count({ where: { userId } }),
    ]);

    return { sessions: sessions as Session[], total };
  }
}

export const sessionRepository = new SessionRepository();
