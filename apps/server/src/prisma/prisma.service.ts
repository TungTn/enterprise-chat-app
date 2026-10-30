import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('🐘 PostgreSQL connected successfully via Prisma');
    } catch (err: any) {
      this.logger.error(`❌ Failed to connect to PostgreSQL: ${err.message}`, err.stack);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🐘 PostgreSQL disconnected cleanly');
    } catch (err: any) {
      this.logger.warn(`Error disconnecting Prisma: ${err.message}`);
    }
  }
}
