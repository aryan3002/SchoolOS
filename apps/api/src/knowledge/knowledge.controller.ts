/**
 * Knowledge Controller
 *
 * REST API endpoints for knowledge management:
 * - Document upload and ingestion
 * - Processing status tracking
 * - Hybrid search
 * - Source lifecycle management
 *
 * All endpoints are protected by JWT authentication and
 * multi-tenant district isolation.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeSourceStatus, KnowledgeSourceType } from '@prisma/client';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsDateString, IsArray, IsUUID, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DistrictId } from '../common/decorators/district-id.decorator';
import { KnowledgeService } from './knowledge.service';
import { HybridSearchService } from './search';
import { 
  KnowledgeWorkflowService, 
  KnowledgeFreshnessService, 
  KnowledgeBulkOperationsService 
} from './workflow';
import { DocumentMetadata, KnowledgeSourceFilters } from './types';
import { HybridSearchOptions, SearchFilters } from './search/types';

// File type for multer
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// DTOs for request/response
class UploadDocumentDto {
  @IsString()
  title!: string;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  @IsEnum(KnowledgeSourceType)
  documentType!: KnowledgeSourceType;
  
  @IsOptional()
  @IsString()
  category?: string;
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
  
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

class UpdateSourceDto {
  @IsOptional()
  @IsString()
  title?: string;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  @IsOptional()
  @IsString()
  category?: string;
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
  
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

class SearchQueryDto {
  @IsString()
  query!: string;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceTypes?: string[];
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
  
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceIds?: string[];
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  vectorWeight?: number;
  
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useReranking?: boolean;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;
}

class ListSourcesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;
  
  @IsOptional()
  @IsEnum(KnowledgeSourceStatus)
  status?: KnowledgeSourceStatus;
  
  @IsOptional()
  @IsEnum(KnowledgeSourceType)
  sourceType?: KnowledgeSourceType;
  
  @IsOptional()
  @IsString()
  category?: string;
  
  @IsOptional()
  @IsString()
  tags?: string;
  
  @IsOptional()
  @IsString()
  searchQuery?: string;
  
  @IsOptional()
  @IsDateString()
  createdAfter?: string;
  
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly searchService: HybridSearchService,
    private readonly workflowService: KnowledgeWorkflowService,
    private readonly freshnessService: KnowledgeFreshnessService,
    private readonly bulkOperationsService: KnowledgeBulkOperationsService,
  ) {}

  @Post('sources/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType: /(pdf|msword|openxmlformats|text|html|markdown)/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: MulterFile,
    @Body() body: UploadDocumentDto,
    @CurrentUser('id') userId: string,
    @DistrictId() districtId: string,
  ) {
    const metadata: DocumentMetadata = {
      title: body.title,
      mimeType: file.mimetype,
      filename: file.originalname,
      documentType: body.documentType,
    };

    if (body.description) metadata.description = body.description;
    if (body.category) metadata.category = body.category;
    if (body.tags) metadata.tags = body.tags;
    if (body.expiresAt) metadata.expiresAt = body.expiresAt;

    const source = await this.knowledgeService.ingestDocument(
      file.buffer,
      metadata,
      districtId,
      userId,
    );

    return {
      success: true,
      data: {
        id: source.id,
        title: source.title,
        status: source.status,
        message: 'Document uploaded. Processing has started.',
      },
    };
  }

  @Get('sources/:id/status')
  async getProcessingStatus(
    @Param('id') sourceId: string,
    @DistrictId() districtId: string,
  ) {
    // Verify source belongs to district
    const source = await this.knowledgeService.getSource(sourceId, districtId);
    const status = this.knowledgeService.getProcessingStatus(sourceId);

    return {
      success: true,
      data: {
        sourceId: source.id,
        title: source.title,
        sourceStatus: source.status,
        processing: status ?? {
          status: source.processedAt ? 'COMPLETED' : 'UNKNOWN',
          progress: source.processedAt ? 100 : 0,
        },
      },
    };
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() body: SearchQueryDto,
    @DistrictId() districtId: string,
  ) {
    if (!body.query || body.query.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }

    const filters: SearchFilters = {};
    if (body.sourceTypes) filters.sourceTypes = body.sourceTypes;
    if (body.categories) filters.categories = body.categories;
    if (body.tags) filters.tags = body.tags;
    if (body.sourceIds) filters.sourceIds = body.sourceIds;

    const options: HybridSearchOptions = {
      query: body.query,
      districtId,
      limit: Math.min(body.limit ?? 10, 50), // Max 50 results
      offset: body.offset ?? 0,
      filters,
    };

    if (body.vectorWeight !== undefined) options.vectorWeight = body.vectorWeight;
    if (body.useReranking !== undefined) options.useReranking = body.useReranking;
    if (body.minScore !== undefined) options.minScore = body.minScore;

    const results = await this.searchService.search(options);

    return {
      success: true,
      data: {
        query: results.query,
        total: results.total,
        results: results.results.map((r) => ({
          chunkId: r.chunkId,
          sourceId: r.sourceId,
          content: r.content,
          score: r.combinedScore,
          highlights: r.highlights,
          metadata: r.metadata,
        })),
        timing: results.timing,
      },
    };
  }

  @Get('sources')
  async listSources(
    @Query() query: ListSourcesQueryDto,
    @DistrictId() districtId: string,
  ) {
    const filters: KnowledgeSourceFilters = {};
    if (query.status) filters.status = query.status;
    if (query.sourceType) filters.sourceType = query.sourceType;
    if (query.category) filters.category = query.category;
    if (query.tags) filters.tags = query.tags.split(',').map((t) => t.trim());
    if (query.searchQuery) filters.searchQuery = query.searchQuery;
    if (query.createdAfter) filters.createdAfter = new Date(query.createdAfter);
    if (query.createdBefore) filters.createdBefore = new Date(query.createdBefore);

    const result = await this.knowledgeService.listSources(
      districtId,
      filters,
      query.page ?? 1,
      Math.min(query.pageSize ?? 20, 100),
    );

    return {
      success: true,
      data: {
        items: result.items.map((source) => ({
          id: source.id,
          title: source.title,
          description: source.description,
          sourceType: source.sourceType,
          status: source.status,
          category: source.category,
          tags: source.tags,
          fileSize: source.fileSize,
          createdAt: source.createdAt,
          processedAt: source.processedAt,
          publishedAt: source.publishedAt,
        })),
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get('sources/:id')
  async getSource(
    @Param('id') sourceId: string,
    @DistrictId() districtId: string,
  ) {
    const source = await this.knowledgeService.getSource(sourceId, districtId);

    return {
      success: true,
      data: source,
    };
  }

  @Put('sources/:id')
  async updateSource(
    @Param('id') sourceId: string,
    @Body() body: UpdateSourceDto,
    @CurrentUser('id') userId: string,
    @DistrictId() districtId: string,
  ) {
    const updated = await this.knowledgeService.updateSource(
      sourceId,
      districtId,
      userId,
      body,
    );

    return {
      success: true,
      data: updated,
    };
  }

  @Post('sources/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishSource(
    @Param('id') sourceId: string,
    @CurrentUser('id') userId: string,
    @DistrictId() districtId: string,
  ) {
    const source = await this.knowledgeService.publishSource(sourceId, districtId, userId);

    return {
      success: true,
      data: {
        id: source.id,
        status: source.status,
        publishedAt: source.publishedAt,
        message: 'Source published successfully',
      },
    };
  }

  @Post('sources/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveSource(
    @Param('id') sourceId: string,
    @CurrentUser('id') userId: string,
    @DistrictId() districtId: string,
  ) {
    const source = await this.knowledgeService.archiveSource(sourceId, districtId, userId);

    return {
      success: true,
      data: {
        id: source.id,
        status: source.status,
        message: 'Source archived successfully',
      },
    };
  }

  @Delete('sources/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSource(
    @Param('id') sourceId: string,
    @CurrentUser('id') userId: string,
    @DistrictId() districtId: string,
  ) {
    await this.knowledgeService.deleteSource(sourceId, districtId, userId);
  }

  @Get('sources/:id/chunks')
  async getChunks(
    @Param('id') sourceId: string,
    @DistrictId() districtId: string,
  ) {
    const chunks = await this.knowledgeService.getChunks(sourceId, districtId);

    return {
      success: true,
      data: {
        sourceId,
        totalChunks: chunks.length,
        chunks: chunks.map((chunk) => ({
          id: chunk.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata,
        })),
      },
    };
  }

  @Get('chunks/:id/similar')
  async findSimilarChunks(
    @Param('id') chunkId: string,
    @Query('limit') limit: number = 5,
    @DistrictId() districtId: string,
  ) {
    const similar = await this.searchService.findSimilarChunks(
      chunkId,
      districtId,
      Math.min(limit, 20),
    );

    return {
      success: true,
      data: similar,
    };
  }

  // ========================================
  // WORKFLOW ENDPOINTS
  // ========================================

  @Post('sources/:id/submit-review')
  async submitForReview(
    @Param('id') sourceId: string,
    @CurrentUser() user: { id: string },
    @Body('notes') notes?: string,
  ) {
    await this.workflowService.submitForReview({
      sourceId,
      userId: user.id,
      ...(notes !== undefined ? { notes } : {}),
    });

    return {
      success: true,
      message: 'Source submitted for review',
    };
  }

  @Post('sources/:id/approve')
  async approveSource(
    @Param('id') sourceId: string,
    @CurrentUser() user: { id: string },
    @Body('notes') notes?: string,
  ) {
    await this.workflowService.approve({
      sourceId,
      userId: user.id,
      ...(notes !== undefined ? { notes } : {}),
    });

    return {
      success: true,
      message: 'Source approved and published',
    };
  }

  @Post('sources/:id/reject')
  async rejectSource(
    @Param('id') sourceId: string,
    @CurrentUser() user: { id: string },
    @Body('notes') notes?: string,
  ) {
    await this.workflowService.reject({
      sourceId,
      userId: user.id,
      ...(notes !== undefined ? { notes } : {}),
    });

    return {
      success: true,
      message: 'Source rejected',
    };
  }

  @Post('sources/:id/unpublish')
  async unpublishSource(
    @Param('id') sourceId: string,
    @CurrentUser() user: { id: string },
    @Body('notes') notes?: string,
  ) {
    await this.workflowService.unpublish({
      sourceId,
      userId: user.id,
      ...(notes !== undefined ? { notes } : {}),
    });

    return {
      success: true,
      message: 'Source unpublished',
    };
  }

  @Get('pending-reviews')
  async getPendingReviews(@DistrictId() districtId: string) {
    const pending = await this.workflowService.getPendingReviews(districtId);

    return {
      success: true,
      data: {
        total: pending.length,
        sources: pending,
      },
    };
  }

  // ========================================
  // FRESHNESS TRACKING ENDPOINTS
  // ========================================

  @Get('freshness-status')
  async getFreshnessStatus(@DistrictId() districtId: string) {
    const status = await this.freshnessService.getDistrictFreshnessStatus(
      districtId,
    );

    return {
      success: true,
      data: {
        total: status.length,
        fresh: status.filter((s) => s.status === 'fresh').length,
        stale: status.filter((s) => s.status === 'stale').length,
        expired: status.filter((s) => s.status === 'expired').length,
        needsCheck: status.filter((s) => s.status === 'needs_check').length,
        sources: status,
      },
    };
  }

  @Post('sources/:id/check-freshness')
  async checkSourceFreshness(@Param('id') sourceId: string) {
    const result = await this.freshnessService.checkSourceFreshness(sourceId);

    return {
      success: true,
      data: result,
    };
  }

  @Get('expiring-soon')
  async getExpiringSources(
    @DistrictId() districtId: string,
    @Query('days') days: number = 30,
  ) {
    const expiring = await this.freshnessService.getExpiringSources(
      districtId,
      days,
    );

    return {
      success: true,
      data: {
        total: expiring.length,
        sources: expiring,
      },
    };
  }

  // ========================================
  // BULK OPERATIONS ENDPOINTS
  // ========================================

  @Post('bulk/publish')
  async bulkPublish(
    @Body('sourceIds') sourceIds: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }

    const result = await this.bulkOperationsService.bulkPublish({
      sourceIds,
      districtId,
      userId: user.id,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/unpublish')
  async bulkUnpublish(
    @Body('sourceIds') sourceIds: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }

    const result = await this.bulkOperationsService.bulkUnpublish({
      sourceIds,
      districtId,
      userId: user.id,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/archive')
  async bulkArchive(
    @Body('sourceIds') sourceIds: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }

    const result = await this.bulkOperationsService.bulkArchive({
      sourceIds,
      districtId,
      userId: user.id,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/delete')
  async bulkDelete(
    @Body('sourceIds') sourceIds: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }

    const result = await this.bulkOperationsService.bulkDelete({
      sourceIds,
      districtId,
      userId: user.id,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/update-metadata')
  async bulkUpdateMetadata(
    @Body() body: {
      sourceIds: string[];
      category?: string;
      tags?: string[];
      expiresAt?: Date | null;
      checkFrequencyDays?: number;
    },
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!body.sourceIds || body.sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }

    const result = await this.bulkOperationsService.bulkUpdateMetadata({
      sourceIds: body.sourceIds,
      districtId,
      userId: user.id,
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
      ...(body.checkFrequencyDays !== undefined ? { checkFrequencyDays: body.checkFrequencyDays } : {}),
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/add-tags')
  async bulkAddTags(
    @Body('sourceIds') sourceIds: string[],
    @Body('tags') tags: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }
    if (!tags || tags.length === 0) {
      throw new BadRequestException('No tags provided');
    }

    const result = await this.bulkOperationsService.bulkAddTags({
      sourceIds,
      districtId,
      userId: user.id,
      tags,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/remove-tags')
  async bulkRemoveTags(
    @Body('sourceIds') sourceIds: string[],
    @Body('tags') tags: string[],
    @DistrictId() districtId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('No source IDs provided');
    }
    if (!tags || tags.length === 0) {
      throw new BadRequestException('No tags provided');
    }

    const result = await this.bulkOperationsService.bulkRemoveTags({
      sourceIds,
      districtId,
      userId: user.id,
      tags,
    });

    return {
      success: result.success,
      data: result,
    };
  }
}
