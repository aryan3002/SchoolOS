/**
 * Knowledge and RAG Types
 */

/**
 * Knowledge source types
 */
export enum KnowledgeSourceType {
  PDF = 'PDF',
  WEB_PAGE = 'WEB_PAGE',
  POLICY_DOCUMENT = 'POLICY_DOCUMENT',
  HANDBOOK = 'HANDBOOK',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  FAQ = 'FAQ',
  FORM = 'FORM',
  CALENDAR = 'CALENDAR',
}

/**
 * Knowledge source status
 */
export enum KnowledgeSourceStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
}

/**
 * Knowledge source document
 */
export interface KnowledgeSource {
  id: string;
  districtId: string;
  title: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  content?: string;
  originalUrl?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSize?: number;
  version: number;
  status: KnowledgeSourceStatus;
  isPublic: boolean;
  visibleToRoles: string[];
  publishedAt?: Date;
  expiresAt?: Date;
  category?: string;
  tags: string[];
  metadata: KnowledgeMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Knowledge metadata
 */
export interface KnowledgeMetadata {
  pageCount?: number;
  wordCount?: number;
  lastReviewedAt?: string;
  reviewedBy?: string;
  sourceSystem?: string;
  originalDocumentId?: string;
  [key: string]: unknown;
}

/**
 * Knowledge chunk for RAG
 */
export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  startOffset?: number;
  endOffset?: number;
  metadata: ChunkMetadata;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  section?: string;
  pageNumber?: number;
  heading?: string;
  [key: string]: unknown;
}

/**
 * Search result from vector search
 */
export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  source: Pick<KnowledgeSource, 'id' | 'title' | 'sourceType' | 'category'>;
  relevanceScore: number;
  excerpt: string;
}

/**
 * Source citation in AI response
 */
export interface SourceCitation {
  sourceId: string;
  sourceTitle: string;
  sourceType: KnowledgeSourceType;
  chunkId: string;
  relevanceScore: number;
  excerpt: string;
  category?: string;
}

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  title: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  category?: string;
  tags?: string[];
  visibleToRoles?: string[];
  expiresAt?: Date;
}

/**
 * Document processing status
 */
export interface DocumentProcessingStatus {
  sourceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  chunksCreated?: number;
  error?: string;
}
