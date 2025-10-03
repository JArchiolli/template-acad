import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { UsersRepository } from './users.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { AcademiesRepository } from './academies.repository';
import { PlansRepository } from './plans.repository';

const repositories = [
  UsersRepository,
  RefreshTokenRepository,
  AcademiesRepository,
  PlansRepository,
];

@Module({
  imports: [PrismaModule],
  providers: repositories,
  exports: repositories,
})
export class RepositoriesModule {}
