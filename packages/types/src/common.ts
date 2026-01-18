/**
 * Common Types and Utilities
 */

/**
 * UUID type alias
 */
export type UUID = string;

/**
 * Timestamp as ISO string
 */
export type ISOTimestamp = string;

/**
 * JSON-serializable value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Generic record type
 */
export type JsonObject = Record<string, JsonValue>;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Date range
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Address structure
 */
export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

/**
 * Phone number with type
 */
export interface PhoneNumber {
  number: string;
  type: 'home' | 'work' | 'mobile' | 'other';
  isPrimary?: boolean;
}

/**
 * Time zone identifier
 */
export type TimeZone = string;

/**
 * Locale identifier
 */
export type Locale = string;

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Audit log action
 */
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  EXPORT = 'EXPORT',
  BULK_OPERATION = 'BULK_OPERATION',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  districtId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: {
    before?: JsonObject;
    after?: JsonObject;
  };
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: JsonObject;
  createdAt: Date;
}

/**
 * District configuration
 */
export interface DistrictConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  timezone: string;
  settings: DistrictSettings;
  features: DistrictFeatures;
  branding: DistrictBranding;
}

/**
 * District settings
 */
export interface DistrictSettings {
  schoolYear: string;
  gradingScale: string;
  attendancePolicy: string;
  [key: string]: unknown;
}

/**
 * District feature flags
 */
export interface DistrictFeatures {
  aiChat: boolean;
  documentUpload: boolean;
  sisSync: boolean;
  lmsSync: boolean;
  [key: string]: boolean;
}

/**
 * District branding
 */
export interface DistrictBranding {
  primaryColor: string;
  secondaryColor?: string;
  logo?: string;
  favicon?: string;
}
