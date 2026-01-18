/**
 * Hybrid Search Types
 */

export interface VectorSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface KeywordSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  score: number;
  highlights: string[];
  metadata: Record<string, unknown>;
}

export interface HybridSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  combinedScore: number;
  vectorScore: number | null;
  keywordScore: number | null;
  rerankScore: number | null;
  highlights: string[];
  metadata: Record<string, unknown>;
}

export interface SearchFilters {
  sourceTypes?: string[];
  categories?: string[];
  tags?: string[];
  sourceIds?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface HybridSearchOptions {
  query: string;
  districtId: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  vectorWeight?: number; // 0-1, weight for vector search (keyword = 1 - vectorWeight)
  useReranking?: boolean;
  minScore?: number;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  query: string;
  timing: {
    vectorSearchMs?: number;
    keywordSearchMs?: number;
    rerankingMs?: number;
    totalMs: number;
  };
}

export interface RerankRequest {
  query: string;
  documents: Array<{
    id: string;
    content: string;
  }>;
}

export interface RerankResponse {
  results: Array<{
    id: string;
    score: number;
  }>;
}
