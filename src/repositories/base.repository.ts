import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Base repository with common database operations
 * Supports transactions via Unit of Work pattern
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get the Prisma delegate for the specific model
   * Each repository must implement this
   */
  protected abstract getDelegate(tx?: Prisma.TransactionClient): any;

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<T | null> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.findUnique({
      where: { id },
    });
  }

  async findMany(
    where?: any,
    options?: { skip?: number; take?: number; orderBy?: any },
    tx?: Prisma.TransactionClient,
  ): Promise<T[]> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.findMany({
      where,
      ...options,
    });
  }

  async create(data: any, tx?: Prisma.TransactionClient): Promise<T> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.create({
      data,
    });
  }

  async update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<T> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<T> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.delete({
      where: { id },
    });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<T> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(where?: any, tx?: Prisma.TransactionClient): Promise<number> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.count({
      where,
    });
  }

  async exists(where: any, tx?: Prisma.TransactionClient): Promise<boolean> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    const count = await delegate.count({
      where,
      take: 1,
    });
    return count > 0;
  }
}
