import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../database/unit-of-work';
import { PrismaService } from '../database/prisma.service';
import { UsersRepository } from '../repositories/users.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { Prisma } from '@prisma/client';

/**
 * Example service demonstrating Unit of Work usage
 * 
 * This shows how to use transactions across multiple repositories
 */
@Injectable()
export class UserRegistrationService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly prisma: PrismaService,
    private readonly usersRepo: UsersRepository,
    private readonly tokensRepo: RefreshTokenRepository,
  ) {}

  /**
   * Register user with initial refresh token in a single transaction
   * If any operation fails, everything is rolled back
   */
  async registerUserWithToken(userData: Prisma.UserCreateInput, tokenData: { token: string; expiresAt: Date }) {
    return this.unitOfWork.execute(async (tx) => {
      
      const user = await this.usersRepo.createUser(userData, tx);
      
      const refreshToken = await this.tokensRepo.createToken(
        {
          user: { connect: { id: user.id } },
          token: tokenData.token,
          expiresAt: tokenData.expiresAt,
        },
        tx,
      );


      return { user, refreshToken };
    });
  }

  /**
   * Example: Delete user and revoke all their tokens atomically
   */
  async deleteUserWithTokens(userId: string) {
    return this.unitOfWork.execute(async (tx) => {
      await this.tokensRepo.revokeUserTokens(userId, undefined, tx);
      
      await this.usersRepo.softDelete(userId, tx);

      return { success: true };
    });
  }

  /**
   * Example: Using batch operations for independent queries
   */
  async batchExample() {
    const [users, tokens] = await this.unitOfWork.batch([
      this.prisma.user.findMany({ take: 10 }),
      this.prisma.userRefreshToken.findMany({ take: 10 }),
    ]);

    return { users, tokens };
  }

  /**
   * Example: Custom transaction options (timeout, isolation level)
   */
  async withCustomOptions(userData: Prisma.UserCreateInput) {
    return this.unitOfWork.executeWithOptions(
      async (tx) => {
        return this.usersRepo.createUser(userData, tx);
      },
      {
        maxWait: 5000,  
        timeout: 10000, 
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
