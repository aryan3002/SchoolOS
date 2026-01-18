/**
 * Authentication Types
 */

export enum UserRole {
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** District ID (tenant) */
  districtId: string;
  /** User role */
  role: UserRole;
  /** User status */
  status: UserStatus;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Token type */
  type: 'access' | 'refresh';
}

/**
 * Decoded user from JWT
 */
export interface AuthUser {
  id: string;
  email: string;
  districtId: string;
  role: UserRole;
  status: UserStatus;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  /** Optional: remember me for longer session */
  rememberMe?: boolean;
}

/**
 * Registration data
 */
export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  districtId: string;
}

/**
 * Authentication tokens response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Login response
 */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    districtId: string;
  };
  tokens: AuthTokens;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset completion
 */
export interface PasswordResetComplete {
  token: string;
  newPassword: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Permission types
 */
export enum Resource {
  STUDENT_RECORD = 'student_record',
  GRADE = 'grade',
  ATTENDANCE = 'attendance',
  POLICY_DOCUMENT = 'policy_document',
  KNOWLEDGE_SOURCE = 'knowledge_source',
  CONVERSATION = 'conversation',
  USER = 'user',
  DISTRICT = 'district',
  RELATIONSHIP = 'relationship',
}

export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export type Permission = `${Resource}:${Action}`;

/**
 * Authorization result
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredRelationship?: string;
}

/**
 * Relationship types for access control
 */
export enum RelationshipType {
  PARENT_OF = 'PARENT_OF',
  GUARDIAN_OF = 'GUARDIAN_OF',
  TEACHER_OF = 'TEACHER_OF',
  COTEACHER_OF = 'COTEACHER_OF',
  COUNSELOR_OF = 'COUNSELOR_OF',
  ADMIN_OF = 'ADMIN_OF',
}

/**
 * Session information
 */
export interface Session {
  id: string;
  userId: string;
  districtId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}
