/**
 * Soft Delete Middleware
 *
 * Provides soft delete functionality for models with deletedAt field.
 * - Transforms delete operations into updates that set deletedAt
 * - Automatically filters out soft-deleted records from queries
 */

import { PrismaClient } from '@prisma/client';

// Models that support soft delete (have deletedAt field)
const SOFT_DELETE_MODELS = new Set([
  'District',
  'School',
  'Section',
  'User',
  'UserRelationship',
  'KnowledgeSource',
]);

/**
 * Creates a Prisma client with soft delete behavior.
 *
 * @param prisma - Base Prisma client
 * @param options - Configuration options
 * @returns Extended Prisma client with soft delete
 *
 * @example
 * ```typescript
 * const softDeletePrisma = createSoftDeleteClient(prisma);
 *
 * // This will set deletedAt instead of actually deleting
 * await softDeletePrisma.user.delete({ where: { id: userId } });
 *
 * // This will only return non-deleted users
 * await softDeletePrisma.user.findMany();
 *
 * // To include deleted records, use includeDeleted
 * await softDeletePrisma.user.findMany({ where: { deletedAt: { not: null } } });
 * ```
 */
export function createSoftDeleteClient(
  prisma: PrismaClient,
  options: {
    /**
     * Whether to automatically exclude soft-deleted records from queries.
     * Default: true
     */
    excludeDeletedByDefault?: boolean;
  } = {},
): PrismaClient {
  const { excludeDeletedByDefault = true } = options;

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async findFirst({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async findFirstOrThrow({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async findUnique({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            // For findUnique, we need to use findFirst with the unique constraint
            // because we can't add additional where clauses
            const result = await query(args);
            if (result && (result as { deletedAt?: Date }).deletedAt !== null) {
              return null;
            }
            return result;
          }
          return query(args);
        },

        async findUniqueOrThrow({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            const result = await query(args);
            if (result && (result as { deletedAt?: Date }).deletedAt !== null) {
              throw new Error('Record not found');
            }
            return result;
          }
          return query(args);
        },

        async count({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async aggregate({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async groupBy({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },

        async delete({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            // Transform delete into soft delete
            return (prisma as any)[model].update({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },

        async deleteMany({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            // Transform deleteMany into soft delete
            return (prisma as any)[model].updateMany({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },

        async updateMany({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (SOFT_DELETE_MODELS.has(model) && excludeDeletedByDefault) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Hard delete a record (actually remove from database).
 * Use with caution - this bypasses soft delete.
 *
 * @param prisma - Prisma client
 * @param model - Model name
 * @param where - Where clause
 */
export async function hardDelete<T extends keyof PrismaClient>(
  prisma: PrismaClient,
  model: T,
  where: Record<string, unknown>,
): Promise<void> {
  // Use raw query to bypass soft delete middleware
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${String(model).toLowerCase()}s" WHERE id = $1`,
    where['id'],
  );
}

/**
 * Restore a soft-deleted record.
 *
 * @param prisma - Prisma client
 * @param model - Model name
 * @param id - Record ID
 */
export async function restore(
  prisma: PrismaClient,
  model: string,
  id: string,
): Promise<void> {
  await (prisma as any)[model].update({
    where: { id },
    data: { deletedAt: null },
  });
}

/**
 * Find soft-deleted records.
 *
 * @param prisma - Prisma client (without soft delete middleware)
 * @param model - Model name
 * @param where - Additional where conditions
 */
export async function findDeleted<T>(
  prisma: PrismaClient,
  model: string,
  where: Record<string, unknown> = {},
): Promise<T[]> {
  return (prisma as any)[model].findMany({
    where: {
      ...where,
      deletedAt: { not: null },
    },
  });
}
