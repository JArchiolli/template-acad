import { Injectable } from '@nestjs/common';
import { UserRefreshToken, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseRepository } from './base.repository';

type RefreshTokenWithUser = Prisma.UserRefreshTokenGetPayload<{
  include: { user: true };
}>;

@Injectable()
export class RefreshTokenRepository extends BaseRepository<UserRefreshToken> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(tx?: Prisma.TransactionClient) {
    return tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
  }

  async findValidToken(token: string, tx?: Prisma.TransactionClient): Promise<RefreshTokenWithUser | null> {
    const delegate = tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
    return delegate.findFirst({
      where: {
        token,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async createToken(data: Prisma.UserRefreshTokenCreateInput, tx?: Prisma.TransactionClient): Promise<UserRefreshToken> {
    const delegate = tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
    return delegate.create({
      data,
    });
  }

  async revokeToken(id: string, tx?: Prisma.TransactionClient): Promise<UserRefreshToken> {
    const delegate = tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
    return delegate.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeUserTokens(userId: string, token?: string, tx?: Prisma.TransactionClient): Promise<number> {
    const delegate = tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
    const result = await delegate.updateMany({
      where: {
        userId,
        ...(token && { token }),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async cleanExpiredTokens(tx?: Prisma.TransactionClient): Promise<number> {
    const delegate = tx ? tx.userRefreshToken : this.prisma.userRefreshToken;
    const result = await delegate.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}
