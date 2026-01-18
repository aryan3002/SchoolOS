/**
 * Embedding Service Types
 */

import { DocumentChunk } from '../chunking/types';

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface EmbeddingResult {
  chunks: EmbeddedChunk[];
  statistics: EmbeddingStatistics;
}

export interface EmbeddingStatistics {
  totalChunks: number;
  totalTokens: number;
  cachedChunks: number;
  generatedChunks: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  model: string;
}

export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getModel(): string;
  getDimensions(): number;
}
