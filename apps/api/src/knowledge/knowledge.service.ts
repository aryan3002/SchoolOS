/**
 * Knowledge Service
 *
 * Production-grade knowledge management service that handles:
 * - Document ingestion and processing
 * - Chunk storage and embedding management
 * - Processing status tracking
 * - Source lifecycle management
 *
 * This service coordinates between parsers, chunkers, and embedding services
 * to transform raw documents into searchable knowledge.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeSource, KnowledgeChunk, Prisma, AuditAction } from '@prisma/client';
import * as crypto from 'crypto';

import { PrismaService } from '../database/prisma.service';
import { DocumentParserFactory } from './parsers';
import { SemanticChunker, ProcessedDocument } from './chunking';
import { EmbeddingService, EmbeddedChunk } from './embeddings';
import {
  DocumentMetadata,
  IngestionOptions,
  ProcessingStatus,
  KnowledgeSourceFilters,
  PaginatedResult,
} from './types';

// In-memory processing status (in production, use Redis)
const processingStatusMap = new Map<string, ProcessingStatus>();

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    _configService: ConfigService,
    private readonly parserFactory: DocumentParserFactory,
    private readonly chunker: SemanticChunker,
    private readonly embeddingService: EmbeddingService,
  ) {
    // ConfigService can be used for file storage configuration in production
  }

  /**
   * Ingest a new document into the knowledge base
   */
  async ingestDocument(
    file: Buffer,
    metadata: DocumentMetadata,
    districtId: string,
    uploadedBy: string,
    options?: IngestionOptions,
  ): Promise<KnowledgeSource> {
    this.logger.log('Starting document ingestion', {
      title: metadata.title,
      districtId,
      uploadedBy,
      fileSize: file.length,
      mimeType: metadata.mimeType,
    });

    // Validate MIME type is supported
    if (!this.parserFactory.isSupported(metadata.mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${metadata.mimeType}. Supported types: ${this.parserFactory.getSupportedMimeTypes().join(', ')}`,
      );
    }

    // Generate file hash for deduplication
    const fileHash = crypto.createHash('sha256').update(file).digest('hex');

    // Check for duplicate
    const existing = await this.prisma.knowledgeSource.findFirst({
      where: {
        districtId,
        metadata: {
          path: ['fileHash'],
          equals: fileHash,
        },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`A document with the same content already exists: ${existing.title}`);
    }

    // Create knowledge source record
    const source = await this.prisma.knowledgeSource.create({
      data: {
        districtId,
        title: metadata.title,
        ...(metadata.description ? { description: metadata.description } : {}),
        sourceType: metadata.documentType,
        status: 'DRAFT',
        ...(metadata.category ? { category: metadata.category } : {}),
        tags: metadata.tags ?? [],
        fileMimeType: metadata.mimeType,
        fileSize: file.length,
        ...(metadata.expiresAt ? { expiresAt: metadata.expiresAt } : {}),
        createdBy: uploadedBy,
        metadata: {
          originalFilename: metadata.filename,
          fileHash,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Log audit event
    await this.logAuditEvent(districtId, uploadedBy, AuditAction.CREATE, 'KnowledgeSource', source.id, {
      title: metadata.title,
      sourceType: metadata.documentType,
    });

    // Initialize processing status
    this.updateProcessingStatus(source.id, {
      sourceId: source.id,
      status: 'QUEUED',
      progress: 0,
      startedAt: new Date(),
    });

    // Process document (in production, this would be queued)
    if (!options?.skipProcessing) {
      // Process in background
      this.processDocument(source.id, file, districtId, uploadedBy, options).catch((error) => {
        this.logger.error('Document processing failed', {
          sourceId: source.id,
          error: error.message,
        });
      });
    }

    return source;
  }

  /**
   * Process a document: parse, chunk, embed, and index
   */
  async processDocument(
    sourceId: string,
    file: Buffer,
    districtId: string,
    userId: string,
    options?: IngestionOptions,
  ): Promise<void> {
    this.logger.log('Starting document processing', { sourceId });

    try {
      // Get source record
      const source = await this.prisma.knowledgeSource.findUnique({
        where: { id: sourceId },
      });

      if (!source) {
        throw new NotFoundException(`Knowledge source not found: ${sourceId}`);
      }

      // Update status: PARSING
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'PARSING',
        progress: 10,
        currentStep: 'Extracting text from document',
      });

      // Parse document
      const parsed = await this.parserFactory.parse(file, source.fileMimeType || 'application/octet-stream');

      const processedDoc: ProcessedDocument = {
        ...parsed,
        id: sourceId,
        districtId,
        sourceId,
      };

      // Update content in source
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: {
          content: parsed.content,
          metadata: {
            ...(source.metadata as object || {}),
            pageCount: parsed.metadata.pageCount,
            wordCount: parsed.metadata.wordCount,
            parsedAt: new Date().toISOString(),
          },
        },
      });

      // Update status: CHUNKING
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'CHUNKING',
        progress: 30,
        currentStep: 'Splitting document into chunks',
      });

      // Chunk document
      const { chunks, statistics: chunkStats } = await this.chunker.chunk(processedDoc, options?.chunkingOptions);

      this.logger.log('Document chunked', {
        sourceId,
        totalChunks: chunkStats.totalChunks,
        averageChunkSize: Math.round(chunkStats.averageChunkSize),
      });

      // Update status: EMBEDDING
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'EMBEDDING',
        progress: 50,
        currentStep: 'Generating embeddings',
      });

      // Generate embeddings
      const { chunks: embeddedChunks, statistics: embedStats } = await this.embeddingService.generateEmbeddings(chunks);

      this.logger.log('Embeddings generated', {
        sourceId,
        totalChunks: embedStats.totalChunks,
        cachedChunks: embedStats.cachedChunks,
        durationMs: embedStats.totalDurationMs,
      });

      // Update status: INDEXING
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'INDEXING',
        progress: 70,
        currentStep: 'Storing chunks in database',
      });

      // Store chunks in database
      await this.storeChunks(sourceId, embeddedChunks);

      // Update status: COMPLETED
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Processing complete',
        completedAt: new Date(),
      });

      // Update source status to PENDING_REVIEW
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: {
          status: 'PENDING_REVIEW',
          processedAt: new Date(),
          metadata: {
            ...(source.metadata as Record<string, unknown> ?? {}),
            chunkStats: {
              totalChunks: chunkStats.totalChunks,
              averageChunkSize: chunkStats.averageChunkSize,
              minChunkSize: chunkStats.minChunkSize,
              maxChunkSize: chunkStats.maxChunkSize,
              totalTokens: chunkStats.totalTokens,
            },
            embedStats: {
              model: embedStats.model,
              totalTokens: embedStats.totalTokens,
            },
            processedAt: new Date().toISOString(),
          },
        },
      });

      // Log audit event
      await this.logAuditEvent(districtId, userId, AuditAction.UPDATE, 'KnowledgeSource', sourceId, {
        action: 'processed',
        chunkCount: chunkStats.totalChunks,
      });

      this.logger.log('Document processing completed', { sourceId });
    } catch (error) {
      this.logger.error('Document processing failed', {
        sourceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update status: FAILED
      this.updateProcessingStatus(sourceId, {
        sourceId,
        status: 'FAILED',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });

      // Update source with error
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: {
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Store embedded chunks in the database
   */
  private async storeChunks(sourceId: string, chunks: EmbeddedChunk[]): Promise<void> {
    // Delete existing chunks for this source (for re-processing)
    await this.prisma.knowledgeChunk.deleteMany({
      where: { sourceId },
    });

    // Insert chunks in batches
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      await Promise.all(
        batch.map((chunk) =>
          this.prisma.$executeRaw`
            INSERT INTO knowledge_chunks (id, source_id, content, chunk_index, metadata, created_at, updated_at, embedding)
            VALUES (
              ${chunk.id}::uuid,
              ${sourceId}::uuid,
              ${chunk.content},
              ${chunk.metadata.chunkIndex},
              ${JSON.stringify(chunk.metadata)}::jsonb,
              NOW(),
              NOW(),
              ${`[${chunk.embedding.join(',')}]`}::vector
            )
          `,
        ),
      );
    }

    this.logger.log('Chunks stored', { sourceId, totalChunks: chunks.length });
  }

  /**
   * Get processing status for a source
   */
  getProcessingStatus(sourceId: string): ProcessingStatus | null {
    return processingStatusMap.get(sourceId) || null;
  }

  /**
   * Update processing status
   */
  private updateProcessingStatus(sourceId: string, status: ProcessingStatus): void {
    processingStatusMap.set(sourceId, status);
  }

  /**
   * Get a knowledge source by ID
   */
  async getSource(sourceId: string, districtId: string): Promise<KnowledgeSource> {
    const source = await this.prisma.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        districtId,
        deletedAt: null,
      },
    });

    if (!source) {
      throw new NotFoundException(`Knowledge source not found: ${sourceId}`);
    }

    return source;
  }

  /**
   * List knowledge sources with pagination and filtering
   */
  async listSources(
    districtId: string,
    filters: KnowledgeSourceFilters,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedResult<KnowledgeSource>> {
    const where: Prisma.KnowledgeSourceWhereInput = {
      districtId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.createdAfter) {
      where.createdAt = {
        gte: filters.createdAfter,
      };
    }

    if (filters.createdBefore) {
      where.createdAt = {
        ...(where.createdAt as object || {}),
        lte: filters.createdBefore,
      };
    }

    if (filters.searchQuery) {
      where.OR = [
        { title: { contains: filters.searchQuery, mode: 'insensitive' } },
        { description: { contains: filters.searchQuery, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.knowledgeSource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.knowledgeSource.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update a knowledge source
   */
  async updateSource(
    sourceId: string,
    districtId: string,
    userId: string,
    data: Partial<Pick<KnowledgeSource, 'title' | 'description' | 'category' | 'tags' | 'expiresAt'>>,
  ): Promise<KnowledgeSource> {
    // Verify source exists and belongs to district
    await this.getSource(sourceId, districtId);

    const updated = await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data,
    });

    await this.logAuditEvent(districtId, userId, AuditAction.UPDATE, 'KnowledgeSource', sourceId, {
      changes: data,
    });

    return updated;
  }

  /**
   * Publish a knowledge source
   */
  async publishSource(sourceId: string, districtId: string, userId: string): Promise<KnowledgeSource> {
    const source = await this.getSource(sourceId, districtId);

    if (source.status !== 'PENDING_REVIEW' && source.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot publish source with status: ${source.status}`);
    }

    // Verify chunks exist
    const chunkCount = await this.prisma.knowledgeChunk.count({
      where: { sourceId },
    });

    if (chunkCount === 0) {
      throw new BadRequestException('Cannot publish source without processed chunks');
    }

    const updated = await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        isPublic: true,
      },
    });

    await this.logAuditEvent(districtId, userId, AuditAction.UPDATE, 'KnowledgeSource', sourceId, {
      action: 'published',
    });

    return updated;
  }

  /**
   * Archive a knowledge source
   */
  async archiveSource(sourceId: string, districtId: string, userId: string): Promise<KnowledgeSource> {
    // Verify source exists and belongs to district
    await this.getSource(sourceId, districtId);

    const updated = await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: 'ARCHIVED',
        isPublic: false,
      },
    });

    await this.logAuditEvent(districtId, userId, AuditAction.UPDATE, 'KnowledgeSource', sourceId, {
      action: 'archived',
    });

    return updated;
  }

  /**
   * Delete a knowledge source (soft delete)
   */
  async deleteSource(sourceId: string, districtId: string, userId: string): Promise<void> {
    const source = await this.getSource(sourceId, districtId);

    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
      },
    });

    await this.logAuditEvent(districtId, userId, AuditAction.DELETE, 'KnowledgeSource', sourceId, {
      title: source.title,
    });
  }

  /**
   * Get chunks for a source
   */
  async getChunks(sourceId: string, districtId: string): Promise<KnowledgeChunk[]> {
    // Verify source exists and belongs to district
    await this.getSource(sourceId, districtId);

    return this.prisma.knowledgeChunk.findMany({
      where: { sourceId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  /**
   * Log an audit event
   */
  private async logAuditEvent(
    districtId: string,
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          districtId,
          userId,
          action,
          entityType,
          entityId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action,
        entityType,
        entityId,
      });
    }
  }
}
