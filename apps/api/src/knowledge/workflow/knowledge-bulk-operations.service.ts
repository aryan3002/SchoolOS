/**
 * Knowledge Bulk Operations Service
 *
 * Handles bulk operations on knowledge sources:
 * - Bulk publish/unpublish
 * - Bulk archive/delete
 * - Bulk tag updates
 * - Bulk metadata updates
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    sourceId: string;
    error: string;
  }>;
}

export interface BulkUpdateOptions {
  sourceIds: string[];
  districtId: string;
  userId: string;
}

export interface BulkMetadataUpdate extends BulkUpdateOptions {
  category?: string;
  tags?: string[];
  expiresAt?: Date | null;
  checkFrequencyDays?: number;
}

@Injectable()
export class KnowledgeBulkOperationsService {
  private readonly logger = new Logger(KnowledgeBulkOperationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bulk publish sources
   */
  async bulkPublish(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const { sourceIds, districtId, userId } = options;
    
    this.logger.log('Starting bulk publish', {
      count: sourceIds.length,
      districtId,
      userId,
    });

    const errors: Array<{ sourceId: string; error: string }> = [];
    let succeeded = 0;

    for (const sourceId of sourceIds) {
      try {
        await this.prisma.knowledgeSource.updateMany({
          where: {
            id: sourceId,
            districtId,
            status: { in: ['DRAFT', 'PENDING_REVIEW'] },
            deletedAt: null,
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            approvedBy: userId,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        succeeded++;
      } catch (error) {
        errors.push({
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log('Bulk publish completed', {
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
    });

    return {
      success: errors.length === 0,
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Bulk unpublish sources
   */
  async bulkUnpublish(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const { sourceIds, districtId } = options;
    
    this.logger.log('Starting bulk unpublish', {
      count: sourceIds.length,
      districtId,
    });

    const errors: Array<{ sourceId: string; error: string }> = [];
    let succeeded = 0;

    for (const sourceId of sourceIds) {
      try {
        await this.prisma.knowledgeSource.updateMany({
          where: {
            id: sourceId,
            districtId,
            status: 'PUBLISHED',
            deletedAt: null,
          },
          data: {
            status: 'DRAFT',
            updatedAt: new Date(),
          },
        });
        succeeded++;
      } catch (error) {
        errors.push({
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Bulk archive sources
   */
  async bulkArchive(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const { sourceIds, districtId } = options;
    
    this.logger.log('Starting bulk archive', {
      count: sourceIds.length,
      districtId,
    });

    try {
      const result = await this.prisma.knowledgeSource.updateMany({
        where: {
          id: { in: sourceIds },
          districtId,
          deletedAt: null,
        },
        data: {
          status: 'ARCHIVED',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        processed: sourceIds.length,
        succeeded: result.count,
        failed: sourceIds.length - result.count,
        errors: [],
      };
    } catch (error) {
      this.logger.error('Bulk archive failed', {
        error: error instanceof Error ? error.message : error,
      });
      
      return {
        success: false,
        processed: sourceIds.length,
        succeeded: 0,
        failed: sourceIds.length,
        errors: [{
          sourceId: 'all',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  /**
   * Bulk delete sources (soft delete)
   */
  async bulkDelete(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const { sourceIds, districtId } = options;
    
    this.logger.log('Starting bulk delete', {
      count: sourceIds.length,
      districtId,
    });

    try {
      const result = await this.prisma.knowledgeSource.updateMany({
        where: {
          id: { in: sourceIds },
          districtId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        success: true,
        processed: sourceIds.length,
        succeeded: result.count,
        failed: sourceIds.length - result.count,
        errors: [],
      };
    } catch (error) {
      this.logger.error('Bulk delete failed', {
        error: error instanceof Error ? error.message : error,
      });
      
      return {
        success: false,
        processed: sourceIds.length,
        succeeded: 0,
        failed: sourceIds.length,
        errors: [{
          sourceId: 'all',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  /**
   * Bulk update metadata
   */
  async bulkUpdateMetadata(options: BulkMetadataUpdate): Promise<BulkOperationResult> {
    const { sourceIds, districtId, category, tags, expiresAt, checkFrequencyDays } = options;
    
    this.logger.log('Starting bulk metadata update', {
      count: sourceIds.length,
      districtId,
    });

    const updateData: Prisma.KnowledgeSourceUpdateInput = {
      updatedAt: new Date(),
    };

    if (category !== undefined) {
      updateData.category = category;
    }
    if (tags !== undefined) {
      updateData.tags = tags;
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt;
    }
    if (checkFrequencyDays !== undefined) {
      updateData.checkFrequencyDays = checkFrequencyDays;
    }

    const errors: Array<{ sourceId: string; error: string }> = [];
    let succeeded = 0;

    for (const sourceId of sourceIds) {
      try {
        await this.prisma.knowledgeSource.updateMany({
          where: {
            id: sourceId,
            districtId,
            deletedAt: null,
          },
          data: updateData,
        });
        succeeded++;
      } catch (error) {
        errors.push({
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Bulk add tags (append to existing)
   */
  async bulkAddTags(
    options: BulkUpdateOptions & { tags: string[] },
  ): Promise<BulkOperationResult> {
    const { sourceIds, districtId, tags } = options;
    
    this.logger.log('Starting bulk add tags', {
      count: sourceIds.length,
      districtId,
      tags,
    });

    const errors: Array<{ sourceId: string; error: string }> = [];
    let succeeded = 0;

    for (const sourceId of sourceIds) {
      try {
        const source = await this.prisma.knowledgeSource.findFirst({
          where: {
            id: sourceId,
            districtId,
            deletedAt: null,
          },
          select: { tags: true },
        });

        if (source) {
          const existingTags = new Set(source.tags);
          tags.forEach(tag => existingTags.add(tag));

          await this.prisma.knowledgeSource.update({
            where: { id: sourceId },
            data: {
              tags: Array.from(existingTags),
              updatedAt: new Date(),
            },
          });
          succeeded++;
        }
      } catch (error) {
        errors.push({
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Bulk remove tags
   */
  async bulkRemoveTags(
    options: BulkUpdateOptions & { tags: string[] },
  ): Promise<BulkOperationResult> {
    const { sourceIds, districtId, tags } = options;
    
    this.logger.log('Starting bulk remove tags', {
      count: sourceIds.length,
      districtId,
      tags,
    });

    const tagsToRemove = new Set(tags);
    const errors: Array<{ sourceId: string; error: string }> = [];
    let succeeded = 0;

    for (const sourceId of sourceIds) {
      try {
        const source = await this.prisma.knowledgeSource.findFirst({
          where: {
            id: sourceId,
            districtId,
            deletedAt: null,
          },
          select: { tags: true },
        });

        if (source) {
          const updatedTags = source.tags.filter(tag => !tagsToRemove.has(tag));

          await this.prisma.knowledgeSource.update({
            where: { id: sourceId },
            data: {
              tags: updatedTags,
              updatedAt: new Date(),
            },
          });
          succeeded++;
        }
      } catch (error) {
        errors.push({
          sourceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: sourceIds.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }
}
