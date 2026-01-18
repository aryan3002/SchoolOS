/**
 * Knowledge Service Types
 */

import { KnowledgeSourceType, KnowledgeSourceStatus } from '@prisma/client';

export interface DocumentMetadata {
  title: string;
  filename: string;
  mimeType: string;
  documentType: KnowledgeSourceType;
  description?: string;
  category?: string;
  tags?: string[];
  expiresAt?: Date;
}

export interface IngestionOptions {
  autoPublish?: boolean;
  skipProcessing?: boolean;
  chunkingOptions?: {
    minChunkSize?: number;
    maxChunkSize?: number;
    overlapSize?: number;
  };
}

export interface ProcessingStatus {
  sourceId: string;
  status: 'QUEUED' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SearchContext {
  districtId: string;
  userId?: string;
  userRole?: string;
  childId?: string;
  categories?: string[];
  sourceTypes?: KnowledgeSourceType[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  includeContent?: boolean;
  includeMetadata?: boolean;
  rerank?: boolean;
  hybridWeight?: number; // 0 = keyword only, 1 = vector only, 0.5 = balanced
}

export interface SearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  score: number;
  vectorScore?: number;
  keywordScore?: number;
  fusedScore?: number;
  metadata: {
    sourceTitle: string;
    sourceType: KnowledgeSourceType;
    sectionHeader?: string;
    pageNumber?: number;
    chunkIndex: number;
    category?: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchDurationMs: number;
  vectorSearchDurationMs?: number;
  keywordSearchDurationMs?: number;
}

export interface KnowledgeSourceFilters {
  status?: KnowledgeSourceStatus;
  sourceType?: KnowledgeSourceType;
  category?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
