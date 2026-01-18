/**
 * Relationship Cache Service
 *
 * Provides caching for relationship queries using Redis.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RelationshipCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RelationshipCacheService.name);
  private redis: Redis | null = null;
  private readonly prefix = 'relationships:';
  private readonly enabled: boolean;

  // In-memory fallback cache
  private memoryCache = new Map<string, { value: unknown; expiry: number }>();

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('REDIS_URL') !== undefined;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Redis not configured, using in-memory cache');
      return;
    }

    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      this.redis = new Redis(redisUrl!, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redis.connect();
      this.logger.log('Connected to Redis for relationship caching');
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis, falling back to in-memory cache: ${(error as Error).message}`,
      );
      this.redis = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefix + key;

    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        this.logger.error(`Redis get error: ${(error as Error).message}`);
        return null;
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(fullKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }

    if (cached) {
      this.memoryCache.delete(fullKey);
    }

    return null;
  }

  /**
   * Set cached value
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const fullKey = this.prefix + key;

    if (this.redis) {
      try {
        await this.redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        this.logger.error(`Redis set error: ${(error as Error).message}`);
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(fullKey, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    // Clean up old entries periodically
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;

    if (this.redis) {
      try {
        await this.redis.del(fullKey);
        return;
      } catch (error) {
        this.logger.error(`Redis delete error: ${(error as Error).message}`);
      }
    }

    this.memoryCache.delete(fullKey);
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.prefix + pattern;

    if (this.redis) {
      try {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (error) {
        this.logger.error(`Redis delete pattern error: ${(error as Error).message}`);
      }
    }

    // Fallback to memory cache
    const regex = new RegExp('^' + fullPattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(this.prefix + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (error) {
        this.logger.error(`Redis clear error: ${(error as Error).message}`);
      }
    }

    this.memoryCache.clear();
  }

  /**
   * Clean up expired entries in memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
  }
}
