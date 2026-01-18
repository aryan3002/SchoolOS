/**
 * Tenant Isolation Middleware
 *
 * Automatically enforces district_id filtering on all queries.
 * This is CRITICAL for data security in a multi-tenant environment.
 *
 * Usage:
 *   const prismaWithTenant = createTenantIsolatedClient(prisma, districtId);
 *   // All queries will automatically filter by districtId
 */

import { PrismaClient } from '@prisma/client';

// Models that require tenant isolation (have districtId field)
const TENANT_SCOPED_MODELS = new Set([
  'User',
  'School',
  'UserRelationship',
  'Token',
  'KnowledgeSource',
  'Conversation',
  'AuditLog',
]);

type QueryAction =
  | 'findFirst'
  | 'findFirstOrThrow'
  | 'findMany'
  | 'findUnique'
  | 'findUniqueOrThrow'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'delete'
  | 'deleteMany'
  | 'upsert'
  | 'count'
  | 'aggregate'
  | 'groupBy';

interface MiddlewareParams {
  model?: string;
  action: QueryAction;
  args: Record<string, unknown>;
  dataPath: string[];
  runInTransaction: boolean;
}

type MiddlewareResult = unknown;

/**
 * Creates a Prisma middleware that enforces tenant isolation.
 *
 * @param districtId - The district ID to filter by
 * @returns Prisma middleware function
 */
export function createTenantIsolationMiddleware(
  districtId: string,
): (
  params: MiddlewareParams,
  next: (params: MiddlewareParams) => Promise<MiddlewareResult>,
) => Promise<MiddlewareResult> {
  return async (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => Promise<MiddlewareResult>,
  ): Promise<MiddlewareResult> => {
    const model = params.model;

    // Skip if model is not tenant-scoped
    if (!model || !TENANT_SCOPED_MODELS.has(model)) {
      return next(params);
    }

    // Add districtId filter to queries
    const readActions: QueryAction[] = [
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'findUnique',
      'findUniqueOrThrow',
      'count',
      'aggregate',
      'groupBy',
    ];

    const writeActions: QueryAction[] = [
      'update',
      'updateMany',
      'delete',
      'deleteMany',
    ];

    const createActions: QueryAction[] = ['create', 'createMany', 'upsert'];

    if (readActions.includes(params.action)) {
      // Add where clause filter
      if (params.args['where']) {
        params.args['where'] = {
          ...params.args['where'],
          districtId,
        };
      } else {
        params.args['where'] = { districtId };
      }
    }

    if (writeActions.includes(params.action)) {
      // Add where clause filter for updates/deletes
      if (params.args['where']) {
        params.args['where'] = {
          ...params.args['where'],
          districtId,
        };
      } else {
        params.args['where'] = { districtId };
      }
    }

    if (createActions.includes(params.action)) {
      // Inject districtId into data for creates
      if (params.action === 'create' || params.action === 'upsert') {
        if (params.args['data']) {
          params.args['data'] = {
            ...params.args['data'],
            districtId,
          };
        }
      }

      if (params.action === 'createMany') {
        const data = params.args['data'];
        if (Array.isArray(data)) {
          params.args['data'] = data.map((item: Record<string, unknown>) => ({
            ...item,
            districtId,
          }));
        }
      }

      // For upsert, also add to update and where
      if (params.action === 'upsert') {
        if (params.args['update']) {
          params.args['update'] = {
            ...params.args['update'],
            districtId,
          };
        }
        if (params.args['where']) {
          params.args['where'] = {
            ...params.args['where'],
            districtId,
          };
        }
      }
    }

    return next(params);
  };
}

/**
 * Type for tenant-isolated Prisma client
 */
export type TenantIsolatedPrismaClient = PrismaClient & {
  $tenantId: string;
};

/**
 * Creates a Prisma client instance with tenant isolation middleware applied.
 *
 * @param prisma - Base Prisma client
 * @param districtId - The district ID to scope all queries to
 * @returns Prisma client with tenant isolation
 *
 * @example
 * ```typescript
 * const tenantPrisma = createTenantIsolatedClient(prisma, user.districtId);
 * // All queries will automatically filter by districtId
 * const users = await tenantPrisma.user.findMany(); // Only returns users from the district
 * ```
 */
export function createTenantIsolatedClient(
  prisma: PrismaClient,
  districtId: string,
): TenantIsolatedPrismaClient {
  // Validate districtId format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(districtId)) {
    throw new Error(`Invalid districtId format: ${districtId}`);
  }

  // Create extended client with middleware
  const extendedClient = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          // Skip non-tenant-scoped models
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const readOps = [
            'findFirst',
            'findFirstOrThrow',
            'findMany',
            'findUnique',
            'findUniqueOrThrow',
            'count',
            'aggregate',
            'groupBy',
          ];

          const writeOps = ['update', 'updateMany', 'delete', 'deleteMany'];
          const createOps = ['create', 'createMany', 'upsert'];

          // Add districtId filter to read operations
          if (readOps.includes(operation)) {
            args.where = { ...args.where, districtId };
          }

          // Add districtId filter to write operations
          if (writeOps.includes(operation)) {
            args.where = { ...args.where, districtId };
          }

          // Inject districtId into create operations
          if (createOps.includes(operation)) {
            if (operation === 'create' || operation === 'upsert') {
              args.data = { ...args.data, districtId };
            }
            if (operation === 'createMany' && Array.isArray(args.data)) {
              args.data = args.data.map((item: Record<string, unknown>) => ({
                ...item,
                districtId,
              }));
            }
            if (operation === 'upsert') {
              args.update = { ...args.update, districtId };
              args.where = { ...args.where, districtId };
            }
          }

          return query(args);
        },
      },
    },
  }) as unknown as TenantIsolatedPrismaClient;

  // Attach tenant ID for reference
  extendedClient.$tenantId = districtId;

  return extendedClient;
}

/**
 * Validates that a record belongs to the expected district.
 * Use this for additional security checks on sensitive operations.
 *
 * @param record - Record with districtId field
 * @param expectedDistrictId - Expected district ID
 * @throws Error if district IDs don't match
 */
export function assertTenantMatch(
  record: { districtId: string } | null | undefined,
  expectedDistrictId: string,
): void {
  if (!record) {
    throw new Error('Record not found');
  }

  if (record.districtId !== expectedDistrictId) {
    throw new Error('Access denied: Record belongs to different district');
  }
}
