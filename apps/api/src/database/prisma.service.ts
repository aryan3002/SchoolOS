/**
 * Prisma Service
 *
 * Manages Prisma client lifecycle and provides tenant-isolated access.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to database');

    // Log slow queries in development
    if (process.env['NODE_ENV'] === 'development') {
      // @ts-expect-error - Prisma event types
      this.$on('query', (e: { query: string; duration: number }) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Clean database for testing
   * WARNING: Only use in test environment!
   */
  async cleanDatabase(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('cleanDatabase() can only be used in test environment');
    }

    // Get all model names from Prisma client
    const modelNames = [
      'auditLog',
      'token',
      'message',
      'conversation',
      'userRelationship',
      'user',
      'school',
      'district',
    ];

    // Delete in reverse order to respect foreign key constraints
    for (const modelName of modelNames) {
      const model = (this as Record<string, unknown>)[modelName];
      if (model && typeof (model as { deleteMany?: unknown }).deleteMany === 'function') {
        await (model as { deleteMany: () => Promise<unknown> }).deleteMany();
      }
    }
  }
}
