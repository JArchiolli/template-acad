import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly context = PrismaService.name;

  constructor(private readonly logger: LoggerService) {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    if (process.env.NODE_ENV === 'development') {
      // @ts-expect-error - Prisma query event types
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`, this.context);
        this.logger.debug(`Duration: ${e.duration}ms`, this.context);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected', this.context);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected', this.context);
  }

  /**
   * Clean database (useful for testing)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key !== '_requestResponse' && typeof key === 'string' && !key.startsWith('_'),
    );

    return Promise.all(
      models.map((modelKey) => {
        // @ts-ignore
        if (this[modelKey] && typeof this[modelKey].deleteMany === 'function') {
          // @ts-ignore
          return this[modelKey].deleteMany();
        }
      }),
    );
  }
}
