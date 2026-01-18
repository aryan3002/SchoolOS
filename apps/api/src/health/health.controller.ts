/**
 * Health Controller
 *
 * Provides health check endpoints for load balancers and monitoring.
 */

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Basic health check
   */
  @Get()
  @Public()
  async check(): Promise<HealthResponse> {
    const dbCheck = await this.checkDatabase();

    const status = dbCheck.status === 'up' ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('npm_package_version') ?? '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: dbCheck,
      },
    };
  }

  /**
   * Liveness probe (for Kubernetes)
   */
  @Get('live')
  @Public()
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe (for Kubernetes)
   */
  @Get('ready')
  @Public()
  async ready(): Promise<{ status: string }> {
    const dbCheck = await this.checkDatabase();

    if (dbCheck.status !== 'up') {
      throw new Error('Database not ready');
    }

    return { status: 'ok' };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: (error as Error).message,
      };
    }
  }
}
