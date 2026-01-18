/**
 * Chunking Types
 *
 * Type definitions for document chunking system.
 */

import { ParsedDocument } from '../parsers/types';

export interface DocumentChunk {
  id: string;
  content: string;
  tokenCount: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sourceId?: string;
  chunkIndex: number;
  startOffset?: number;
  endOffset?: number;
  sectionHeader?: string;
  sectionHeaders?: string[];
  pageNumber?: number;
  pageNumbers?: number[];
  type: 'section' | 'semantic' | 'paragraph' | 'overlap';
  startSentence?: number;
  endSentence?: number;
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface ChunkingOptions {
  minChunkSize?: number; // Minimum tokens per chunk
  maxChunkSize?: number; // Maximum tokens per chunk
  overlapSize?: number; // Overlap tokens between chunks
  respectSectionBoundaries?: boolean;
  preserveParagraphs?: boolean;
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  statistics: ChunkingStatistics;
}

export interface ChunkingStatistics {
  totalChunks: number;
  totalTokens: number;
  averageChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  sectionBasedChunks: number;
  semanticChunks: number;
  overlapChunks: number;
}

export interface ProcessedDocument extends ParsedDocument {
  id?: string;
  districtId?: string;
  sourceId?: string;
}
