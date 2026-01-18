/**
 * Knowledge Freshness Service
 *
 * Tracks content freshness and checks for updates to external sources.
 * Features:
 * - Scheduled checks for web pages
 * - Content hash comparison
 * - Auto-versioning on content changes
 * - Expiration warnings
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeSourceType } from '@prisma/client';
import * as crypto from 'crypto';
import { WebScraperService } from '../scrapers/web-scraper.service';

export interface FreshnessStatus {
  sourceId: string;
  title: string;
  status: 'fresh' | 'stale' | 'expired' | 'needs_check';
  lastChecked?: Date;
  lastModified?: Date;
  daysUntilExpiry?: number;
  daysUntilCheck?: number;
}

@Injectable()
export class KnowledgeFreshnessService {
  private readonly logger = new Logger(KnowledgeFreshnessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webScraper: WebScraperService,
  ) {}

  /**
   * Calculate content hash (SHA-256)
   */
  calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if source needs freshness check
   */
  needsFreshnessCheck(
    lastCheckedAt: Date | null,
    checkFrequencyDays: number,
  ): boolean {
    if (!lastCheckedAt) {
      return true;
    }

    const daysSinceCheck = Math.floor(
      (Date.now() - lastCheckedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceCheck >= checkFrequencyDays;
  }

  /**
   * Check freshness of a single source
   */
  async checkSourceFreshness(sourceId: string): Promise<{
    hasChanged: boolean;
    newContent?: string;
    newHash?: string;
  }> {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        title: true,
        sourceType: true,
        originalUrl: true,
        content: true,
        contentHash: true,
        lastCheckedAt: true,
        checkFrequencyDays: true,
      },
    });

    if (!source) {
      throw new Error('Source not found');
    }

    // Only check web pages for now
    if (source.sourceType !== KnowledgeSourceType.WEB_PAGE || !source.originalUrl) {
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { lastCheckedAt: new Date() },
      });
      return { hasChanged: false };
    }

    try {
      // Scrape the current version
      const scrapedPage = await this.webScraper.scrapeSinglePage(source.originalUrl);

      if (!scrapedPage) {
        this.logger.warn('Failed to scrape page', {
          sourceId,
          url: source.originalUrl,
        });
        await this.prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { lastCheckedAt: new Date() },
        });
        return { hasChanged: false };
      }

      const newHash = this.calculateContentHash(scrapedPage.content);
      const hasChanged = newHash !== source.contentHash;

      // Update last checked timestamp
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: {
          lastCheckedAt: new Date(),
          ...(hasChanged && { lastModifiedAt: new Date() }),
        },
      });

      if (hasChanged) {
        this.logger.log('Source content has changed', {
          sourceId,
          title: source.title,
          url: source.originalUrl,
        });
        
        return {
          hasChanged: true,
          newContent: scrapedPage.content,
          newHash,
        };
      }

      return { hasChanged: false };
    } catch (error) {
      this.logger.error('Error checking source freshness', {
        sourceId,
        error: error instanceof Error ? error.message : error,
      });
      
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { lastCheckedAt: new Date() },
      });
      
      return { hasChanged: false };
    }
  }

  /**
   * Get freshness status for all sources in a district
   */
  async getDistrictFreshnessStatus(districtId: string): Promise<FreshnessStatus[]> {
    const sources = await this.prisma.knowledgeSource.findMany({
      where: {
        districtId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        lastCheckedAt: true,
        lastModifiedAt: true,
        expiresAt: true,
        checkFrequencyDays: true,
      },
    });

    const now = new Date();

    return sources.map((source) => {
      const checkFrequency = source.checkFrequencyDays || 30;
      
      // Calculate expiration status
      let status: 'fresh' | 'stale' | 'expired' | 'needs_check' = 'fresh';
      let daysUntilExpiry: number | undefined;
      let daysUntilCheck: number | undefined;

      // Check expiration
      if (source.expiresAt) {
        const daysUntilExpiryCalc = Math.floor(
          (source.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        daysUntilExpiry = daysUntilExpiryCalc;

        if (daysUntilExpiryCalc < 0) {
          status = 'expired';
        } else if (daysUntilExpiryCalc < 30) {
          status = 'stale';
        }
      }

      // Check if needs freshness check
      if (this.needsFreshnessCheck(source.lastCheckedAt, checkFrequency)) {
        status = 'needs_check';
      } else if (source.lastCheckedAt) {
        const daysSinceCheck = Math.floor(
          (now.getTime() - source.lastCheckedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        daysUntilCheck = checkFrequency - daysSinceCheck;
      }

      const result: FreshnessStatus = {
        sourceId: source.id,
        title: source.title,
        status,
      };
      
      if (source.lastCheckedAt) {
        result.lastChecked = source.lastCheckedAt;
      }
      if (source.lastModifiedAt) {
        result.lastModified = source.lastModifiedAt;
      }
      if (daysUntilExpiry !== undefined) {
        result.daysUntilExpiry = daysUntilExpiry;
      }
      if (daysUntilCheck !== undefined) {
        result.daysUntilCheck = daysUntilCheck;
      }
      
      return result;
    });
  }

  /**
   * Run freshness checks for all sources that need it
   */
  async runScheduledChecks(districtId: string): Promise<{
    checked: number;
    changed: number;
    errors: number;
  }> {
    const sources = await this.prisma.knowledgeSource.findMany({
      where: {
        districtId,
        status: 'PUBLISHED',
        deletedAt: null,
        sourceType: KnowledgeSourceType.WEB_PAGE,
        originalUrl: { not: null },
      },
      select: {
        id: true,
        lastCheckedAt: true,
        checkFrequencyDays: true,
      },
    });

    let checked = 0;
    let changed = 0;
    let errors = 0;

    for (const source of sources) {
      const checkFrequency = source.checkFrequencyDays || 30;
      
      if (this.needsFreshnessCheck(source.lastCheckedAt, checkFrequency)) {
        try {
          const result = await this.checkSourceFreshness(source.id);
          checked++;
          
          if (result.hasChanged) {
            changed++;
          }
        } catch (error) {
          this.logger.error('Error in scheduled check', {
            sourceId: source.id,
            error: error instanceof Error ? error.message : error,
          });
          errors++;
        }
      }
    }

    this.logger.log('Scheduled freshness checks completed', {
      districtId,
      checked,
      changed,
      errors,
    });

    return { checked, changed, errors };
  }

  /**
   * Get sources that are expiring soon
   */
  async getExpiringSources(
    districtId: string,
    daysThreshold: number = 30,
  ): Promise<Array<{
    id: string;
    title: string;
    expiresAt: Date;
    daysUntilExpiry: number;
  }>> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const sources = await this.prisma.knowledgeSource.findMany({
      where: {
        districtId,
        status: 'PUBLISHED',
        deletedAt: null,
        expiresAt: {
          lte: thresholdDate,
          gte: now,
        },
      },
      select: {
        id: true,
        title: true,
        expiresAt: true,
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    return sources.map((source) => ({
      id: source.id,
      title: source.title,
      expiresAt: source.expiresAt!,
      daysUntilExpiry: Math.floor(
        (source.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }
}
