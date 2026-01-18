/**
 * Pagination Utilities
 *
 * Standardized pagination helpers for consistent API responses.
 */

import { Prisma } from '@prisma/client';

/**
 * Pagination input parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata for response
 */
export interface PaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPreviousPage: boolean;
  /** Cursor for next page (if using cursor pagination) */
  nextCursor?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes pagination parameters with defaults and limits.
 *
 * @param params - Raw pagination parameters
 * @returns Normalized pagination parameters
 */
export function normalizePaginationParams(
  params: PaginationParams,
): Required<Omit<PaginationParams, 'cursor' | 'sortBy' | 'sortOrder'>> & {
  cursor?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const sortOrder = params.sortOrder ?? 'desc';

  return {
    page,
    pageSize,
    cursor: params.cursor,
    sortBy: params.sortBy,
    sortOrder,
  };
}

/**
 * Calculates Prisma skip/take values from pagination parameters.
 *
 * @param params - Normalized pagination parameters
 * @returns Prisma pagination args
 */
export function getPrismaPageArgs(params: {
  page: number;
  pageSize: number;
}): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  };
}

/**
 * Creates pagination metadata from query results.
 *
 * @param params - Pagination parameters used
 * @param totalItems - Total number of items
 * @param lastItemId - ID of the last item (for cursor pagination)
 * @returns Pagination metadata
 */
export function createPaginationMeta(
  params: { page: number; pageSize: number },
  totalItems: number,
  lastItemId?: string,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  return {
    page: params.page,
    pageSize: params.pageSize,
    totalItems,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
    nextCursor: lastItemId,
  };
}

/**
 * Creates a paginated response.
 *
 * @param data - Array of items
 * @param params - Pagination parameters
 * @param totalItems - Total number of items
 * @returns Paginated response
 */
export function createPaginatedResponse<T extends { id: string }>(
  data: T[],
  params: { page: number; pageSize: number },
  totalItems: number,
): PaginatedResponse<T> {
  const lastItem = data[data.length - 1];
  const meta = createPaginationMeta(params, totalItems, lastItem?.id);

  return { data, meta };
}

/**
 * Helper to build orderBy clause from sort parameters.
 *
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction
 * @param allowedFields - Set of allowed sort fields
 * @param defaultField - Default field if sortBy is not allowed
 * @returns Prisma orderBy clause
 */
export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc',
  allowedFields: Set<string>,
  defaultField: string = 'createdAt',
): Record<string, 'asc' | 'desc'> {
  const field =
    sortBy && allowedFields.has(sortBy) ? sortBy : defaultField;
  return { [field]: sortOrder };
}

/**
 * Cursor-based pagination utilities
 */
export const CursorPagination = {
  /**
   * Gets Prisma args for cursor-based pagination.
   *
   * @param cursor - Cursor string (usually an ID)
   * @param pageSize - Number of items to return
   * @returns Prisma pagination args
   */
  getPrismaArgs(
    cursor: string | undefined,
    pageSize: number,
  ): { cursor?: { id: string }; skip?: number; take: number } {
    if (cursor) {
      return {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
        take: pageSize,
      };
    }
    return { take: pageSize };
  },

  /**
   * Creates cursor pagination metadata.
   *
   * @param data - Array of items
   * @param pageSize - Requested page size
   * @returns Cursor pagination metadata
   */
  createMeta<T extends { id: string }>(
    data: T[],
    pageSize: number,
  ): { nextCursor?: string; hasNextPage: boolean } {
    // If we got the full page size, there might be more
    const hasNextPage = data.length === pageSize;
    const lastItem = data[data.length - 1];

    return {
      nextCursor: hasNextPage ? lastItem?.id : undefined,
      hasNextPage,
    };
  },
};

/**
 * Type-safe pagination wrapper for Prisma queries.
 *
 * @example
 * ```typescript
 * const result = await paginate(
 *   prisma.user,
 *   { page: 1, pageSize: 20 },
 *   { where: { districtId: 'xxx' }, orderBy: { createdAt: 'desc' } }
 * );
 * // result: { data: User[], meta: PaginationMeta }
 * ```
 */
export async function paginate<T extends { id: string }, A>(
  model: {
    findMany: (args: A & { skip?: number; take?: number }) => Promise<T[]>;
    count: (args: { where?: unknown }) => Promise<number>;
  },
  params: PaginationParams,
  args: A & { where?: unknown },
): Promise<PaginatedResponse<T>> {
  const normalizedParams = normalizePaginationParams(params);
  const prismaPageArgs = getPrismaPageArgs(normalizedParams);

  const [data, totalItems] = await Promise.all([
    model.findMany({ ...args, ...prismaPageArgs }),
    model.count({ where: args.where }),
  ]);

  return createPaginatedResponse(data, normalizedParams, totalItems);
}
