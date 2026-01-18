/**
 * Token Service
 *
 * Manages JWT token generation, verification, and storage.
 */

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenType, UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { PrismaService } from '../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  districtId: string;
  schoolId: string | null;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Default expiry times in minutes
const DEFAULT_ACCESS_EXPIRY_MINUTES = 15;
const DEFAULT_REFRESH_EXPIRY_MINUTES = 7 * 24 * 60; // 7 days

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessExpiryMinutes: number;
  private readonly refreshExpiryMinutes: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.accessExpiryMinutes = this.parseExpiry(
      this.configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m',
      DEFAULT_ACCESS_EXPIRY_MINUTES,
    );
    this.refreshExpiryMinutes = this.parseExpiry(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') ?? '7d',
      DEFAULT_REFRESH_EXPIRY_MINUTES,
    );
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    user: {
      id: string;
      email: string;
      role: UserRole;
      districtId: string;
      schoolId: string | null;
    },
    refreshExpiryOverride?: number,
  ): Promise<TokenPair> {
    const jti = uuidv4();

    // Generate access token
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      districtId: user.districtId,
      schoolId: user.schoolId,
      type: 'access',
      jti,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: `${this.accessExpiryMinutes}m`,
    });

    // Generate refresh token with longer expiry
    const refreshExpiry = refreshExpiryOverride ?? this.refreshExpiryMinutes;
    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      ...accessPayload,
      type: 'refresh',
      jti: uuidv4(),
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: `${refreshExpiry}m`,
    });

    // Store refresh token in database for revocation support
    await this.prisma.token.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        districtId: user.districtId,
        type: TokenType.REFRESH_TOKEN,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiry * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiryMinutes * 60, // in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      if (payload.type !== 'access') {
        this.logger.warn('Invalid token type for access verification');
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.debug(`Access token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      if (payload.type !== 'refresh') {
        this.logger.warn('Invalid token type for refresh verification');
        return null;
      }

      // Verify token exists in database and is not revoked
      const hashedToken = this.hashToken(token);
      const storedToken = await this.prisma.token.findFirst({
        where: {
          userId: payload.sub,
          type: TokenType.REFRESH_TOKEN,
          tokenHash: hashedToken,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        this.logger.warn('Refresh token not found or revoked');
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.debug(`Refresh token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Create a one-time use token (for email verification, password reset, etc.)
   */
  async createToken(
    userId: string,
    districtId: string,
    type: TokenType,
    expiryMinutes: number,
  ): Promise<{ id: string; token: string }> {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    const record = await this.prisma.token.create({
      data: {
        id: uuidv4(),
        userId,
        districtId,
        type,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      },
    });

    return {
      id: record.id,
      token: token,
    };
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.prisma.token.updateMany({
      where: {
        userId,
        type: TokenType.REFRESH_TOKEN,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    return result.count;
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.token.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: new Date() },
        ],
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired/revoked tokens`);
    return result.count;
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiry string to minutes
   */
  private parseExpiry(expiry: string, defaultMinutes: number): number {
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match || !match[1]) {
      return defaultMinutes;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return Math.ceil(value / 60);
      case 'm':
        return value;
      case 'h':
        return value * 60;
      case 'd':
        return value * 24 * 60;
      default:
        return defaultMinutes;
    }
  }
}
