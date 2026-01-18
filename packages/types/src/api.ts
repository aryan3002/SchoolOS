/**
 * API Response Types
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
  };
  requestId?: string;
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Search parameters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, unknown>;
}

/**
 * Error codes
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RELATIONSHIP_REQUIRED = 'RELATIONSHIP_REQUIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Tenant errors
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
}

/**
 * HTTP status codes commonly used
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
