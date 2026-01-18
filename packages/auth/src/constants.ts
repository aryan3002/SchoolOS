/**
 * Authentication Constants
 */

/**
 * Cookie names
 */
export const COOKIES = {
  ACCESS_TOKEN: 'schoolos_access_token',
  REFRESH_TOKEN: 'schoolos_refresh_token',
  CSRF_TOKEN: 'schoolos_csrf_token',
} as const;

/**
 * Header names
 */
export const HEADERS = {
  AUTHORIZATION: 'Authorization',
  X_DISTRICT_ID: 'X-District-ID',
  X_REQUEST_ID: 'X-Request-ID',
  X_CSRF_TOKEN: 'X-CSRF-Token',
} as const;

/**
 * Rate limiting defaults
 */
export const RATE_LIMITS = {
  /** Authentication attempts */
  AUTH: {
    /** Time window in seconds */
    TTL: 900, // 15 minutes
    /** Max attempts per window */
    MAX: 5,
  },
  /** Account lockout */
  LOCKOUT: {
    /** Number of failures before lockout */
    THRESHOLD: 5,
    /** Lockout duration in seconds */
    DURATION: 900, // 15 minutes
  },
  /** General API rate limit */
  API: {
    TTL: 60,
    MAX: 100,
  },
} as const;

/**
 * Token configuration defaults
 */
export const TOKEN_DEFAULTS = {
  ACCESS_EXPIRY: '15m',
  REFRESH_EXPIRY: '7d',
  VERIFICATION_EXPIRY: '24h',
  PASSWORD_RESET_EXPIRY: '1h',
} as const;

/**
 * Session configuration
 */
export const SESSION = {
  /** Maximum concurrent sessions per user */
  MAX_CONCURRENT: 5,
  /** Session inactivity timeout in seconds */
  INACTIVITY_TIMEOUT: 3600, // 1 hour
  /** Remember me duration in days */
  REMEMBER_ME_DAYS: 30,
} as const;

/**
 * Auth-related error messages
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is locked due to too many failed attempts',
  ACCOUNT_SUSPENDED: 'Account has been suspended',
  ACCOUNT_PENDING: 'Account is pending verification',
  EMAIL_NOT_VERIFIED: 'Email address has not been verified',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Token is invalid',
  SESSION_EXPIRED: 'Session has expired',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  RATE_LIMITED: 'Too many requests, please try again later',
} as const;
