import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UnitOfWork } from './unit-of-work';
import { LoggingModule } from '../logging/logging.module';

@Global()
@Module({
  imports: [LoggingModule],
  providers: [PrismaService, UnitOfWork],
  exports: [PrismaService, UnitOfWork],
})
export class PrismaModule {}
