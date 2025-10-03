import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Unit of Work Pattern
 * 
 * Manages transactions across multiple repositories.
 * Ensures atomicity - either all operations succeed or all fail.
 * 
 * @example
 * ```typescript
 * await this.unitOfWork.execute(async (tx) => {
 *   const user = await this.usersRepo.createUser(userData, tx);
 *   const subscription = await this.subscriptionsRepo.create(subData, tx);
 *   await this.paymentsRepo.create(paymentData, tx);
 *   return { user, subscription };
 * });
 * ```
 */
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute operations within a transaction
   * 
   * @param work - Callback function that receives the transaction client
   * @returns The result of the work function
   * 
   * @throws Will rollback and throw if any operation fails
   */
  async execute<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(work);
  }

  /**
   * Execute operations with custom transaction options
   * 
   * @param work - Callback function that receives the transaction client
   * @param options - Transaction options (maxWait, timeout, isolationLevel)
   * @returns The result of the work function
   */
  async executeWithOptions<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.prisma.$transaction(work, options);
  }

  /**
   * Execute multiple operations in parallel within a transaction
   * Uses Prisma's batch transaction (sequential queries)
   * 
   * @param operations - Array of Prisma operations
   * @returns Array of results
   * 
   * @example
   * ```typescript
   * const [user, academy] = await this.unitOfWork.batch([
   *   this.prisma.user.create({ data: userData }),
   *   this.prisma.academy.create({ data: academyData }),
   * ]);
   * ```
   */
  async batch<T extends readonly Prisma.PrismaPromise<any>[]>(
    operations: T,
  ): Promise<UnwrapTuple<T>> {
    return this.prisma.$transaction([...operations]) as any;
  }
}

type UnwrapTuple<T> = {
  [K in keyof T]: T[K] extends Prisma.PrismaPromise<infer U> ? U : never;
};
