import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(tx?: Prisma.TransactionClient) {
    return tx ? tx.user : this.prisma.user;
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const delegate = tx ? tx.user : this.prisma.user;
    return delegate.findUnique({
      where: { email },
    });
  }

  async findActiveByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const delegate = tx ? tx.user : this.prisma.user;
    return delegate.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async createUser(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const delegate = tx ? tx.user : this.prisma.user;
    return delegate.create({
      data,
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient): Promise<User> {
    const delegate = tx ? tx.user : this.prisma.user;
    return delegate.update({
      where: { id },
      data,
    });
  }

  async findByAcademyRole(academyId: string, role?: string, tx?: Prisma.TransactionClient): Promise<User[]> {
    const delegate = tx ? tx.user : this.prisma.user;
    return delegate.findMany({
      where: {
        academyUsers: {
          some: {
            academyId,
            ...(role && { role: role as any }),
            isActive: true,
          },
        },
        deletedAt: null,
      },
      include: {
        academyUsers: {
          where: { academyId },
        },
      },
    });
  }
}
