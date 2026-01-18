/**
 * Knowledge Module
 *
 * NestJS module for the District Knowledge System.
 * Provides document parsing, chunking, embedding, and hybrid search capabilities.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../database/database.module';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { DocumentParserFactory, PDFParser, WebContentParser } from './parsers';
import { SemanticChunker } from './chunking';
import { EmbeddingService } from './embeddings';
import { HybridSearchService } from './search';
import { WebScraperService } from './scrapers';
import { 
  KnowledgeWorkflowService, 
  KnowledgeFreshnessService, 
  KnowledgeBulkOperationsService 
} from './workflow';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [KnowledgeController],
  providers: [
    // Parsers
    PDFParser,
    WebContentParser,
    DocumentParserFactory,
    // Chunking
    SemanticChunker,
    // Embeddings
    EmbeddingService,
    // Search
    HybridSearchService,
    // Scrapers
    WebScraperService,
    // Workflow
    KnowledgeWorkflowService,
    KnowledgeFreshnessService,
    KnowledgeBulkOperationsService,
    // Main service
    KnowledgeService,
  ],
  exports: [KnowledgeService, HybridSearchService, EmbeddingService],
})
export class KnowledgeModule {}
