// lib/repositories/topic.repository.ts

import type { Topic } from '@/types';
import { prisma } from '@/lib/db';
import { BaseRepository } from './base.repository';

export class TopicRepository extends BaseRepository<Topic> {
  constructor() {
    super(prisma.topic);
  }

  async findByCategory(category: string, limit: number = 20): Promise<Topic[]> {
    return this.prismaModel.findMany({
      where: { category },
      orderBy: { hot: 'desc' },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async findSystemTopics(limit: number = 50): Promise<Topic[]> {
    return this.prismaModel.findMany({
      where: { isSystem: true },
      orderBy: { hot: 'desc' },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async findCustomTopics(userId: string, limit: number = 20): Promise<Topic[]> {
    return this.prismaModel.findMany({
      where: { createdBy: userId, isSystem: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async findHotTopics(limit: number = 20): Promise<Topic[]> {
    return this.prismaModel.findMany({
      orderBy: { hot: 'desc' },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async findTrendingTopics(days: number = 7, limit: number = 20): Promise<Topic[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prismaModel.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { hot: 'desc' },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async incrementHot(topicId: string, amount: number = 1): Promise<Topic> {
    const prisma = this.model as {
      update: (args: {
        where: { id: string };
        data: { hot: { increment: number } };
      }) => Promise<unknown>;
    };
    return prisma.update({
      where: { id: topicId },
      data: { hot: { increment: amount } },
    }) as Promise<Topic>;
  }

  async createCustomTopic(data: {
    title: string;
    category: string;
    createdBy: string;
  }): Promise<Topic> {
    return this.prismaModel.create({
      data: {
        ...data,
        isSystem: false,
        hot: 0,
      },
    }) as Promise<Topic>;
  }

  async searchByKeyword(keyword: string, limit: number = 20): Promise<Topic[]> {
    return this.prismaModel.findMany({
      where: { title: { contains: keyword, mode: 'insensitive' } },
      take: limit,
    }) as Promise<Topic[]>;
  }

  async findByTitleAndUser(title: string, userId: string): Promise<Topic | null> {
    return this.prismaModel.findFirst({
      where: {
        title,
        createdBy: userId,
        isSystem: false,
      },
    }) as Promise<Topic>;
  }

  async findPaginated(params: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }): Promise<{ topics: Topic[]; total: number }> {
    const { where, skip = 0, take = 20 } = params;

    const [topics, total] = await Promise.all([
      this.prismaModel.findMany({
        where,
        orderBy: { hot: 'desc' },
        skip,
        take,
      }),
      this.prismaModel.count({ where }),
    ]);

    return { topics: topics as Topic[], total };
  }
}

export const topicRepository = new TopicRepository();
