/**
 * Audit Log Middleware
 *
 * Automatically creates audit log entries for specified operations.
 * Critical for compliance and security monitoring.
 */

import { PrismaClient, AuditAction } from '@prisma/client';

// Models that require audit logging
const AUDITED_MODELS = new Set([
  'User',
  'UserRelationship',
  'KnowledgeSource',
  'District',
]);

export interface AuditContext {
  /** ID of the user performing the action */
  userId?: string;
  /** District ID for tenant context */
  districtId: string;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Creates a Prisma client that automatically logs audit events.
 *
 * @param prisma - Base Prisma client
 * @param getContext - Function to get current audit context
 * @returns Extended Prisma client with audit logging
 *
 * @example
 * ```typescript
 * const auditPrisma = createAuditLogClient(prisma, () => ({
 *   userId: currentUser.id,
 *   districtId: currentUser.districtId,
 *   ipAddress: request.ip,
 *   userAgent: request.headers['user-agent'],
 *   requestId: request.id,
 * }));
 * ```
 */
export function createAuditLogClient(
  prisma: PrismaClient,
  getContext: () => AuditContext,
): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }: {
          model: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          const result = await query(args);

          if (AUDITED_MODELS.has(model)) {
            await logAuditEvent(prisma, getContext(), {
              action: AuditAction.CREATE,
              entityType: model,
              entityId: (result as { id: string }).id,
              changes: { after: sanitizeForAudit(args.data) },
            });
          }

          return result;
        },

        async update({ model, args, query }) {
          // Get the original record before update
          let before: unknown = null;
          if (AUDITED_MODELS.has(model)) {
            try {
              before = await (prisma as any)[model].findUnique({
                where: args.where,
              });
            } catch {
              // Record might not exist
            }
          }

          const result = await query(args);

          if (AUDITED_MODELS.has(model)) {
            const entityId = (result as { id?: string }).id ?? (args.where as { id?: string }).id;
            
            if (entityId) {
              await logAuditEvent(prisma, getContext(), {
                action: AuditAction.UPDATE,
                entityType: model,
                entityId,
                changes: {
                  before: sanitizeForAudit(before),
                  after: sanitizeForAudit(args.data),
                },
              });
            }
          }

          return result;
        },

        async delete({ model, args, query }) {
          // Get the record before deletion
          let before: unknown = null;
          if (AUDITED_MODELS.has(model)) {
            try {
              before = await (prisma as any)[model].findUnique({
                where: args.where,
              });
            } catch {
              // Record might not exist
            }
          }

          const result = await query(args);

          if (AUDITED_MODELS.has(model)) {
            const entityId = (args.where as { id?: string }).id;
            
            if (entityId) {
              await logAuditEvent(prisma, getContext(), {
                action: AuditAction.DELETE,
                entityType: model,
                entityId,
                changes: { before: sanitizeForAudit(before) },
              });
            }
          }

          return result;
        },

        async upsert({ model, args, query }) {
          // Check if record exists
          let existingRecord: unknown = null;
          if (AUDITED_MODELS.has(model)) {
            try {
              existingRecord = await (prisma as any)[model].findUnique({
                where: args.where,
              });
            } catch {
              // Record might not exist
            }
          }

          const result = await query(args);

          if (AUDITED_MODELS.has(model)) {
            const action = existingRecord
              ? AuditAction.UPDATE
              : AuditAction.CREATE;
            await logAuditEvent(prisma, getContext(), {
              action,
              entityType: model,
              entityId: (result as { id: string }).id,
              changes: {
                before: existingRecord ? sanitizeForAudit(existingRecord) : null,
                after: sanitizeForAudit(
                  existingRecord ? args.update : args.create,
                ),
              },
            });
          }

          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

interface AuditEventData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit event to the database.
 */
async function logAuditEvent(
  prisma: PrismaClient,
  context: AuditContext,
  data: AuditEventData,
): Promise<void> {
  try {
    const logData: any = {
      districtId: context.districtId,
      userId: context.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || {},
    };
    
    if (data.changes !== undefined) {
      logData.changes = data.changes;
    }
    if (context.ipAddress !== undefined) {
      logData.ipAddress = context.ipAddress;
    }
    if (context.userAgent !== undefined) {
      logData.userAgent = context.userAgent;
    }
    if (context.requestId !== undefined) {
      logData.requestId = context.requestId;
    }
    
    await prisma.auditLog.create({ data: logData });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    // But do log the error for investigation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Manually log an audit event.
 * Use for operations that don't go through Prisma middleware.
 */
export async function createAuditLog(
  prisma: PrismaClient,
  context: AuditContext,
  data: AuditEventData,
): Promise<void> {
  await logAuditEvent(prisma, context, data);
}

/**
 * Log a login event.
 */
export async function logLoginEvent(
  prisma: PrismaClient,
  context: AuditContext,
  userId: string,
  success: boolean,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const eventData: AuditEventData = {
    action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    entityType: 'User',
    entityId: userId,
  };
  
  if (metadata !== undefined) {
    eventData.metadata = metadata;
  }
  
  await logAuditEvent(prisma, context, eventData);
}

/**
 * Log a logout event.
 */
export async function logLogoutEvent(
  prisma: PrismaClient,
  context: AuditContext,
  userId: string,
): Promise<void> {
  await logAuditEvent(prisma, context, {
    action: AuditAction.LOGOUT,
    entityType: 'User',
    entityId: userId,
  });
}

/**
 * Log a permission denied event.
 */
export async function logPermissionDenied(
  prisma: PrismaClient,
  context: AuditContext,
  resource: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logAuditEvent(prisma, context, {
    action: AuditAction.PERMISSION_DENIED,
    entityType: resource,
    metadata: { attemptedAction: action, ...metadata },
  });
}

/**
 * Log a data export event.
 */
export async function logExportEvent(
  prisma: PrismaClient,
  context: AuditContext,
  entityType: string,
  recordCount: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logAuditEvent(prisma, context, {
    action: AuditAction.EXPORT,
    entityType,
    metadata: { recordCount, ...metadata },
  });
}

/**
 * Sanitizes data for audit logging.
 * Removes sensitive fields and handles circular references.
 */
function sanitizeForAudit(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const sensitiveFields = new Set([
    'passwordHash',
    'password',
    'tokenHash',
    'refreshToken',
    'accessToken',
    'apiKey',
    'secret',
  ]);

  const result: Record<string, unknown> = {};
  const source = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (sensitiveFields.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      // Don't recurse too deep to avoid circular references
      result[key] = '[Object]';
    } else {
      result[key] = value;
    }
  }

  return result;
}
