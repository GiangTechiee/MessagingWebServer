import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Phương thức helper để xử lý transaction
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return await this.$transaction(fn);
  }
}
