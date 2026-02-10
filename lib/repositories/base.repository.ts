// lib/repositories/base.repository.ts

export abstract class BaseRepository<T> {
  protected model: unknown;

  constructor(model: unknown) {
    this.model = model;
  }

  // Helper method for subclasses to access the prisma model
  protected get prismaModel() {
    return this.model as {
      findUnique: (args: { where: { id: string } }) => Promise<unknown>;
      findMany: (args: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        take?: number;
        skip?: number;
      }) => Promise<unknown[]>;
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
      count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
      findFirst: (args: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, 'asc' | 'desc'>;
      }) => Promise<unknown>;
      upsert: (args: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<unknown>;
    };
  }

  async findById(id: string): Promise<T | null> {
    return (await this.prismaModel.findUnique({ where: { id } })) as T | null;
  }

  async findMany(params: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    skip?: number;
  }): Promise<T[]> {
    return (await this.prismaModel.findMany(params)) as T[];
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return (await this.prismaModel.create({ data })) as T;
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return (await this.prismaModel.update({ where: { id }, data })) as T;
  }

  async delete(id: string): Promise<T> {
    return (await this.prismaModel.delete({ where: { id } })) as T;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return await this.prismaModel.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.count({ where: { id } });
    return count > 0;
  }

  async findFirst(params: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T | null> {
    return (await this.prismaModel.findFirst(params)) as T | null;
  }

  async upsert(params: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<T> {
    return (await this.prismaModel.upsert(params)) as T;
  }
}
