/**
 * Tenant Context Utilities
 *
 * Provides AsyncLocalStorage-based tenant context management.
 * This allows passing tenant context through async operations without explicit parameter passing.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  /** District ID (tenant) */
  districtId: string;
  /** Current user ID */
  userId?: string;
  /** User role */
  role?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}

// AsyncLocalStorage instance for tenant context
const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Runs a function with tenant context.
 *
 * @param context - Tenant context to set
 * @param fn - Function to run
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * await runWithTenant({ districtId: 'xxx', userId: 'yyy' }, async () => {
 *   // All code here has access to tenant context
 *   const ctx = getTenantContext();
 *   console.log(ctx.districtId); // 'xxx'
 * });
 * ```
 */
export function runWithTenant<T>(
  context: TenantContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return tenantContextStorage.run(context, fn);
}

/**
 * Gets the current tenant context.
 *
 * @returns Current tenant context
 * @throws Error if no tenant context is set
 */
export function getTenantContext(): TenantContext {
  const context = tenantContextStorage.getStore();

  if (!context) {
    throw new Error(
      'No tenant context available. Ensure you are running within runWithTenant().',
    );
  }

  return context;
}

/**
 * Gets the current tenant context, or undefined if not set.
 *
 * @returns Current tenant context or undefined
 */
export function getTenantContextOrNull(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Gets the current district ID from context.
 *
 * @returns District ID
 * @throws Error if no tenant context is set
 */
export function getCurrentDistrictId(): string {
  return getTenantContext().districtId;
}

/**
 * Gets the current user ID from context.
 *
 * @returns User ID or undefined
 */
export function getCurrentUserId(): string | undefined {
  return getTenantContextOrNull()?.userId;
}

/**
 * Creates a tenant context object from a user object.
 *
 * @param user - User object with districtId
 * @param requestInfo - Optional request information
 * @returns Tenant context
 */
export function createTenantContextFromUser(
  user: { id: string; districtId: string; role: string },
  requestInfo?: {
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): TenantContext {
  const context: TenantContext = {
    districtId: user.districtId,
    userId: user.id,
    role: user.role,
  };
  
  if (requestInfo?.requestId !== undefined) {
    context.requestId = requestInfo.requestId;
  }
  if (requestInfo?.ipAddress !== undefined) {
    context.ipAddress = requestInfo.ipAddress;
  }
  if (requestInfo?.userAgent !== undefined) {
    context.userAgent = requestInfo.userAgent;
  }
  
  return context;
}

/**
 * Decorator that wraps a method with tenant context from the instance.
 * Useful for services that have a tenant context property.
 *
 * @example
 * ```typescript
 * class MyService {
 *   private context: TenantContext;
 *
 *   @WithTenantContext()
 *   async doSomething() {
 *     // Can use getTenantContext() here
 *   }
 * }
 * ```
 */
export function WithTenantContext(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: { tenantContext?: TenantContext },
      ...args: unknown[]
    ): Promise<unknown> {
      const context = this.tenantContext;

      if (!context) {
        throw new Error(
          'Service must have tenantContext property for @WithTenantContext decorator',
        );
      }

      return runWithTenant(context, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
