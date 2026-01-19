/**
 * JWT Utilities
 *
 * JSON Web Token generation and verification utilities.
 * Uses RS256 (asymmetric) for enhanced security.
 */

import * as jwt from 'jsonwebtoken';

import type { JwtPayload, AuthUser, UserRole, UserStatus } from '@schoolos/types';
import type { StringValue as MsStringValue } from 'ms';

/**
 * JWT configuration
 */
export interface JwtConfig {
  /** RSA private key for signing (PEM format) */
  privateKey: string;
  /** RSA public key for verification (PEM format) */
  publicKey: string;
  /** Access token expiration (e.g., '15m', '1h') */
  accessTokenExpiry: string;
  /** Refresh token expiration (e.g., '7d', '30d') */
  refreshTokenExpiry: string;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string;
}

/**
 * Token pair result
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
  expired?: boolean;
}

/**
 * JWT Service class
 */
export class JwtService {
  private readonly config: JwtConfig;

  constructor(config: JwtConfig) {
    this.config = config;

    // Validate keys are provided
    if (!config.privateKey || !config.publicKey) {
      throw new Error('JWT private and public keys are required');
    }
  }

  /**
   * Generates an access token
   *
   * @param user - User data for payload
   * @returns Signed access token
   */
  generateAccessToken(user: {
    id: string;
    email: string;
    districtId: string;
    role: UserRole;
    status: UserStatus;
  }): string {
    const payload: Partial<JwtPayload> = {
      sub: user.id,
      email: user.email,
      districtId: user.districtId,
      role: user.role,
      status: user.status,
      type: 'access',
    };

    const options: jwt.SignOptions = {
      algorithm: 'RS256',
      expiresIn: this.config.accessTokenExpiry as MsStringValue,
      issuer: this.config.issuer ?? undefined,
      audience: this.config.audience ?? undefined,
    };

    return jwt.sign(payload, this.config.privateKey, options);
  }

  /**
   * Generates a refresh token
   *
   * @param userId - User ID
   * @param districtId - District ID
   * @returns Signed refresh token
   */
  generateRefreshToken(userId: string, districtId: string): string {
    const payload = {
      sub: userId,
      districtId,
      type: 'refresh',
    };

    const options: jwt.SignOptions = {
      algorithm: 'RS256',
      expiresIn: this.config.refreshTokenExpiry as MsStringValue,
      issuer: this.config.issuer ?? undefined,
      audience: this.config.audience ?? undefined,
    };

    return jwt.sign(payload, this.config.privateKey, options);
  }

  /**
   * Generates both access and refresh tokens
   *
   * @param user - User data
   * @returns Token pair with expiration times
   */
  generateTokenPair(user: {
    id: string;
    email: string;
    districtId: string;
    role: UserRole;
    status: UserStatus;
  }): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id, user.districtId);

    // Decode tokens to get expiration times
    const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload;

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date((accessDecoded.exp ?? 0) * 1000),
      refreshTokenExpiresAt: new Date((refreshDecoded.exp ?? 0) * 1000),
    };
  }

  /**
   * Verifies an access token
   *
   * @param token - Token to verify
   * @returns Verification result with payload if valid
   */
  verifyAccessToken(token: string): TokenVerificationResult {
    try {
      const payload = jwt.verify(token, this.config.publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JwtPayload;

      // Verify it's an access token
      if (payload.type !== 'access') {
        return {
          valid: false,
          error: 'Invalid token type',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
          expired: true,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: error.message,
        };
      }

      return {
        valid: false,
        error: 'Token verification failed',
      };
    }
  }

  /**
   * Verifies a refresh token
   *
   * @param token - Token to verify
   * @returns Verification result
   */
  verifyRefreshToken(
    token: string,
  ): TokenVerificationResult & { userId?: string; districtId?: string } {
    try {
      const payload = jwt.verify(token, this.config.publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as jwt.JwtPayload & { type: string; districtId: string };

      // Verify it's a refresh token
      if (payload.type !== 'refresh') {
        return {
          valid: false,
          error: 'Invalid token type',
        };
      }

      const result: TokenVerificationResult & {
        userId?: string;
        districtId?: string;
      } = {
        valid: true,
        districtId: payload.districtId,
      };
      if (payload.sub) {
        result.userId = payload.sub;
      }
      return result;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired',
          expired: true,
        };
      }

      return {
        valid: false,
        error: 'Token verification failed',
      };
    }
  }

  /**
   * Decodes a token without verification (for debugging/inspection)
   *
   * @param token - Token to decode
   * @returns Decoded payload or null
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload | null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts user info from a verified payload
   *
   * @param payload - Verified JWT payload
   * @returns AuthUser object
   */
  extractUser(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      districtId: payload.districtId,
      role: payload.role,
      status: payload.status,
    };
  }
}

/**
 * Creates a JwtService instance from environment variables
 *
 * @param env - Environment variables object
 * @returns Configured JwtService
 */
export function createJwtServiceFromEnv(env: {
  JWT_PRIVATE_KEY?: string;
  JWT_PUBLIC_KEY?: string;
  JWT_ACCESS_TOKEN_EXPIRY?: string;
  JWT_REFRESH_TOKEN_EXPIRY?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
}): JwtService {
  const privateKey = env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const publicKey = env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

  if (!privateKey || !publicKey) {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required');
  }

  return new JwtService({
    privateKey,
    publicKey,
    accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY ?? '15m',
    refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY ?? '7d',
    issuer: env.JWT_ISSUER ?? 'schoolos',
    audience: env.JWT_AUDIENCE ?? 'schoolos-api',
  });
}

/**
 * Parses token expiry string to milliseconds
 *
 * @param expiry - Expiry string (e.g., '15m', '1h', '7d')
 * @returns Expiry in milliseconds
 */
export function parseExpiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }

  const value = parseInt(match[1] ?? '0', 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}
