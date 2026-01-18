/**
 * Knowledge Workflow Service
 *
 * Handles approval workflow for knowledge sources:
 * DRAFT → PENDING_REVIEW → PUBLISHED (or back to DRAFT)
 */

import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

export interface WorkflowTransitionOptions {
  userId: string;
  sourceId: string;
  notes?: string;
}

@Injectable()
export class KnowledgeWorkflowService {
  private readonly logger = new Logger(KnowledgeWorkflowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit source for review (DRAFT → PENDING_REVIEW)
   */
  async submitForReview(options: WorkflowTransitionOptions): Promise<void> {
    const { userId, sourceId, notes } = options;

    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }

    if (source.status !== 'DRAFT') {
      throw new ForbiddenException('Only draft sources can be submitted for review');
    }

    const updateData: any = {
      status: 'PENDING_REVIEW',
      updatedAt: new Date(),
    };
    if (notes !== undefined) {
      updateData.reviewNotes = notes;
    }
    
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    this.logger.log('Source submitted for review', {
      sourceId,
      userId,
      title: source.title,
    });
  }

  /**
   * Approve and publish source (PENDING_REVIEW → PUBLISHED)
   */
  async approve(options: WorkflowTransitionOptions): Promise<void> {
    const { userId, sourceId, notes } = options;

    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }

    if (source.status !== 'PENDING_REVIEW') {
      throw new ForbiddenException('Only sources pending review can be approved');
    }

    const updateData: any = {
      status: 'PUBLISHED',
      reviewedBy: userId,
      reviewedAt: new Date(),
      approvedBy: userId,
      approvedAt: new Date(),
      publishedAt: new Date(),
      updatedAt: new Date(),
    };
    if (notes !== undefined) {
      updateData.reviewNotes = notes;
    }
    
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    this.logger.log('Source approved and published', {
      sourceId,
      userId,
      title: source.title,
    });
  }

  /**
   * Reject and send back to draft (PENDING_REVIEW → DRAFT)
   */
  async reject(options: WorkflowTransitionOptions): Promise<void> {
    const { userId, sourceId, notes } = options;

    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }

    if (source.status !== 'PENDING_REVIEW') {
      throw new ForbiddenException('Only sources pending review can be rejected');
    }

    const updateData: any = {
      status: 'DRAFT',
      reviewedBy: userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    if (notes !== undefined) {
      updateData.reviewNotes = notes;
    }
    
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    this.logger.log('Source rejected and returned to draft', {
      sourceId,
      userId,
      title: source.title,
      reason: notes,
    });
  }

  /**
   * Unpublish source (PUBLISHED → DRAFT)
   */
  async unpublish(options: WorkflowTransitionOptions): Promise<void> {
    const { userId, sourceId, notes } = options;

    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }

    if (source.status !== 'PUBLISHED') {
      throw new ForbiddenException('Only published sources can be unpublished');
    }

    const updateData: any = {
      status: 'DRAFT',
      updatedAt: new Date(),
    };
    if (notes !== undefined) {
      updateData.reviewNotes = notes;
    }
    
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    this.logger.log('Source unpublished', {
      sourceId,
      userId,
      title: source.title,
    });
  }

  /**
   * Archive source
   */
  async archive(options: WorkflowTransitionOptions): Promise<void> {
    const { userId, sourceId, notes } = options;

    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }

    const updateData: any = {
      status: 'ARCHIVED',
      updatedAt: new Date(),
    };
    if (notes !== undefined) {
      updateData.reviewNotes = notes;
    }
    
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    this.logger.log('Source archived', {
      sourceId,
      userId,
      title: source.title,
    });
  }

  /**
   * Get sources pending review
   */
  async getPendingReviews(districtId: string) {
    return this.prisma.knowledgeSource.findMany({
      where: {
        districtId,
        status: 'PENDING_REVIEW',
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        sourceType: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        reviewNotes: true,
      },
    });
  }

  /**
   * Check if user can approve sources
   */
  canApprove(userRole: UserRole): boolean {
    return userRole === UserRole.ADMIN || userRole === UserRole.STAFF;
  }
}
