/**
 * Prisma Client Export
 *
 * Singleton Prisma client instance with logging configuration.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
  });
};

// In development, use a global variable to prevent multiple instances during hot-reload
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.prisma = prisma;
}

// Re-export Prisma types for convenience
export { Prisma } from '@prisma/client';
export type {
  User,
  District,
  School,
  Section,
  UserRelationship,
  Token,
  KnowledgeSource,
  KnowledgeChunk,
  Conversation,
  Message,
  MessageSource,
  AuditLog,
  UserRole,
  UserStatus,
  RelationshipType,
  RelationshipStatus,
  KnowledgeSourceType,
  KnowledgeSourceStatus,
  MessageRole,
  ConversationStatus,
  AuditAction,
  TokenType,
} from '@prisma/client';
