/**
 * Hybrid Search Service
 *
 * Implements production-grade hybrid search combining:
 * - Vector similarity search (pgvector)
 * - Full-text keyword search
 * - Reciprocal Rank Fusion for score combination
 * - Optional Claude-based reranking
 *
 * Optimized for educational district knowledge retrieval with
 * multi-tenant isolation and FERPA compliance.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../database/prisma.service';
import { EmbeddingService } from '../embeddings';
import {
  VectorSearchResult,
  KeywordSearchResult,
  HybridSearchResult,
  HybridSearchOptions,
  SearchResponse,
  SearchFilters,
} from './types';

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);
  private readonly rerankingEnabled: boolean;
  private readonly anthropicApiKey: string;
  private readonly defaultVectorWeight: number;
  private readonly defaultLimit: number;
  private readonly rrfK: number; // Reciprocal Rank Fusion constant

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.rerankingEnabled = !!this.anthropicApiKey;
    this.defaultVectorWeight = this.configService.get<number>('SEARCH_VECTOR_WEIGHT') || 0.7;
    this.defaultLimit = this.configService.get<number>('SEARCH_DEFAULT_LIMIT') || 10;
    this.rrfK = this.configService.get<number>('SEARCH_RRF_K') || 60;
  }

  /**
   * Perform hybrid search combining vector and keyword search
   */
  async search(options: HybridSearchOptions): Promise<SearchResponse<HybridSearchResult>> {
    const startTime = Date.now();
    const {
      query,
      districtId,
      limit = this.defaultLimit,
      offset = 0,
      filters,
      vectorWeight = this.defaultVectorWeight,
      useReranking = this.rerankingEnabled,
      minScore = 0,
    } = options;

    this.logger.log('Executing hybrid search', {
      query: query.substring(0, 50),
      districtId,
      limit,
      vectorWeight,
      useReranking,
    });

    // Run vector and keyword searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, districtId, limit * 3, filters), // Fetch more for fusion
      this.keywordSearch(query, districtId, limit * 3, filters),
    ]);

    const vectorSearchMs = Date.now() - startTime;

    // Combine results using Reciprocal Rank Fusion
    let combinedResults = this.reciprocalRankFusion(
      vectorResults.results,
      keywordResults.results,
      vectorWeight,
    );

    const keywordSearchMs = Date.now() - startTime - vectorSearchMs;

    // Optional reranking with Claude
    let rerankingMs = 0;
    if (useReranking && combinedResults.length > 0) {
      const rerankStart = Date.now();
      combinedResults = await this.rerankWithClaude(query, combinedResults);
      rerankingMs = Date.now() - rerankStart;
    }

    // Apply minimum score filter
    combinedResults = combinedResults.filter((r) => r.combinedScore >= minScore);

    // Apply pagination
    const paginatedResults = combinedResults.slice(offset, offset + limit);

    const totalMs = Date.now() - startTime;

    this.logger.log('Hybrid search completed', {
      totalResults: combinedResults.length,
      returnedResults: paginatedResults.length,
      timing: { vectorSearchMs, keywordSearchMs, rerankingMs, totalMs },
    });

    return {
      results: paginatedResults,
      total: combinedResults.length,
      query,
      timing: {
        vectorSearchMs,
        keywordSearchMs,
        rerankingMs,
        totalMs,
      },
    };
  }

  /**
   * Perform vector similarity search using pgvector
   */
  private async vectorSearch(
    query: string,
    districtId: string,
    limit: number,
    filters?: SearchFilters,
  ): Promise<SearchResponse<VectorSearchResult>> {
    const startTime = Date.now();

    // Generate embedding for query
    const { chunks } = await this.embeddingService.generateEmbeddings([
      {
        id: 'query',
        content: query,
        tokenCount: Math.ceil(query.length / 4),
        metadata: {
          chunkIndex: 0,
          startOffset: 0,
          endOffset: query.length,
          type: 'semantic' as const,
        },
      },
    ]);

    const firstChunk = chunks[0];
    if (!firstChunk) {
      throw new Error('Failed to generate query embedding');
    }
    const queryEmbedding = firstChunk.embedding;
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    // Build filter conditions
    const filterConditions = this.buildFilterConditions(filters);

    // Execute vector search using pgvector
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source_id: string;
        content: string;
        metadata: Record<string, unknown>;
        similarity: number;
      }>
    >`
      SELECT 
        kc.id,
        kc.source_id,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> ${embeddingVector}::vector) as similarity
      FROM knowledge_chunks kc
      INNER JOIN knowledge_sources ks ON kc.source_id = ks.id
      WHERE ks.district_id = ${districtId}::uuid
        AND ks.status = 'PUBLISHED'
        AND ks.deleted_at IS NULL
        ${filterConditions.sourceTypes ? this.prisma.$queryRaw`AND ks.source_type = ANY(${filterConditions.sourceTypes}::text[])` : this.prisma.$queryRaw``}
        ${filterConditions.categories ? this.prisma.$queryRaw`AND ks.category = ANY(${filterConditions.categories}::text[])` : this.prisma.$queryRaw``}
        ${filterConditions.sourceIds ? this.prisma.$queryRaw`AND ks.id = ANY(${filterConditions.sourceIds}::uuid[])` : this.prisma.$queryRaw``}
      ORDER BY kc.embedding <=> ${embeddingVector}::vector
      LIMIT ${limit}
    `;

    return {
      results: results.map((r) => ({
        chunkId: r.id,
        sourceId: r.source_id,
        content: r.content,
        score: r.similarity,
        metadata: r.metadata,
      })),
      total: results.length,
      query,
      timing: {
        totalMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Perform full-text keyword search using PostgreSQL tsvector
   */
  private async keywordSearch(
    query: string,
    districtId: string,
    limit: number,
    filters?: SearchFilters,
  ): Promise<SearchResponse<KeywordSearchResult>> {
    const startTime = Date.now();

    // Escape and format query for full-text search
    const tsQuery = query
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .map((word) => word.replace(/[^\w]/g, ''))
      .filter((word) => word.length > 0)
      .join(' | ');

    if (!tsQuery) {
      return {
        results: [],
        total: 0,
        query,
        timing: { totalMs: 0 },
      };
    }

    const filterConditions = this.buildFilterConditions(filters);

    // Execute full-text search
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source_id: string;
        content: string;
        metadata: Record<string, unknown>;
        rank: number;
        headline: string;
      }>
    >`
      SELECT 
        kc.id,
        kc.source_id,
        kc.content,
        kc.metadata,
        ts_rank_cd(to_tsvector('english', kc.content), plainto_tsquery('english', ${query})) as rank,
        ts_headline('english', kc.content, plainto_tsquery('english', ${query}), 'MaxWords=50, MinWords=25, MaxFragments=3') as headline
      FROM knowledge_chunks kc
      INNER JOIN knowledge_sources ks ON kc.source_id = ks.id
      WHERE ks.district_id = ${districtId}::uuid
        AND ks.status = 'PUBLISHED'
        AND ks.deleted_at IS NULL
        AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', ${query})
        ${filterConditions.sourceTypes ? this.prisma.$queryRaw`AND ks.source_type = ANY(${filterConditions.sourceTypes}::text[])` : this.prisma.$queryRaw``}
        ${filterConditions.categories ? this.prisma.$queryRaw`AND ks.category = ANY(${filterConditions.categories}::text[])` : this.prisma.$queryRaw``}
        ${filterConditions.sourceIds ? this.prisma.$queryRaw`AND ks.id = ANY(${filterConditions.sourceIds}::uuid[])` : this.prisma.$queryRaw``}
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return {
      results: results.map((r) => ({
        chunkId: r.id,
        sourceId: r.source_id,
        content: r.content,
        score: r.rank,
        highlights: [r.headline],
        metadata: r.metadata,
      })),
      total: results.length,
      query,
      timing: {
        totalMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Combine results using Reciprocal Rank Fusion (RRF)
   */
  private reciprocalRankFusion(
    vectorResults: VectorSearchResult[],
    keywordResults: KeywordSearchResult[],
    vectorWeight: number,
  ): HybridSearchResult[] {
    const keywordWeight = 1 - vectorWeight;
    const scoreMap = new Map<
      string,
      {
        vectorRank: number | null;
        keywordRank: number | null;
        vectorScore: number | null;
        keywordScore: number | null;
        content: string;
        sourceId: string;
        highlights: string[];
        metadata: Record<string, unknown>;
      }
    >();

    // Add vector results
    vectorResults.forEach((result, index) => {
      scoreMap.set(result.chunkId, {
        vectorRank: index + 1,
        keywordRank: null,
        vectorScore: result.score,
        keywordScore: null,
        content: result.content,
        sourceId: result.sourceId,
        highlights: [],
        metadata: result.metadata,
      });
    });

    // Add/merge keyword results
    keywordResults.forEach((result, index) => {
      const existing = scoreMap.get(result.chunkId);
      if (existing) {
        existing.keywordRank = index + 1;
        existing.keywordScore = result.score;
        existing.highlights = result.highlights;
      } else {
        scoreMap.set(result.chunkId, {
          vectorRank: null,
          keywordRank: index + 1,
          vectorScore: null,
          keywordScore: result.score,
          content: result.content,
          sourceId: result.sourceId,
          highlights: result.highlights,
          metadata: result.metadata,
        });
      }
    });

    // Calculate RRF scores
    const results: HybridSearchResult[] = [];

    scoreMap.forEach((data, chunkId) => {
      // RRF formula: 1 / (k + rank)
      const vectorRRF = data.vectorRank !== null ? 1 / (this.rrfK + data.vectorRank) : 0;
      const keywordRRF = data.keywordRank !== null ? 1 / (this.rrfK + data.keywordRank) : 0;

      // Weighted combination
      const combinedScore = vectorWeight * vectorRRF + keywordWeight * keywordRRF;

      results.push({
        chunkId,
        sourceId: data.sourceId,
        content: data.content,
        combinedScore,
        vectorScore: data.vectorScore,
        keywordScore: data.keywordScore,
        rerankScore: null,
        highlights: data.highlights,
        metadata: data.metadata,
      });
    });

    // Sort by combined score
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    return results;
  }

  /**
   * Rerank results using Claude API
   */
  private async rerankWithClaude(query: string, results: HybridSearchResult[]): Promise<HybridSearchResult[]> {
    if (!this.anthropicApiKey || results.length === 0) {
      return results;
    }

    try {
      // Limit documents for reranking to control costs
      const maxDocsForReranking = 20;
      const topResults = results.slice(0, maxDocsForReranking);

      // Build prompt for reranking
      const documents = topResults.map((r, i) => `Document ${i + 1}:\n${r.content.substring(0, 500)}`).join('\n\n');

      const prompt = `You are a relevance scoring assistant for an educational district knowledge base. 
Score each document's relevance to the query on a scale of 0-10.

Query: "${query}"

${documents}

Respond with ONLY a JSON array of scores in order, like: [8, 5, 9, 3, ...]`;

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Use fast model for reranking
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn('Claude reranking failed', { status: response.status });
        return results;
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const content = data.content?.[0]?.text ?? '';

      // Parse scores from response
      const scoreMatch = content.match(/\[[\d,\s.]+\]/);
      if (!scoreMatch) {
        this.logger.warn('Failed to parse reranking scores');
        return results;
      }

      const scores: number[] = JSON.parse(scoreMatch[0]);

      // Update scores and resort
      scores.forEach((score, i) => {
        const result = topResults[i];
        if (result && i < topResults.length) {
          result.rerankScore = score / 10; // Normalize to 0-1
          // Blend rerank score with combined score
          result.combinedScore = (result.combinedScore + (result.rerankScore ?? 0)) / 2;
        }
      });

      // Resort by new combined score
      topResults.sort((a, b) => b.combinedScore - a.combinedScore);

      // Return top results + remaining unreranked results
      return [...topResults, ...results.slice(maxDocsForReranking)];
    } catch (error) {
      this.logger.error('Reranking error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return results;
    }
  }

  /**
   * Build filter conditions for queries
   */
  private buildFilterConditions(filters?: SearchFilters): {
    sourceTypes?: string[];
    categories?: string[];
    tags?: string[];
    sourceIds?: string[];
  } {
    if (!filters) return {};

    const result: {
      sourceTypes?: string[];
      categories?: string[];
      tags?: string[];
      sourceIds?: string[];
    } = {};

    if (filters.sourceTypes) result.sourceTypes = filters.sourceTypes;
    if (filters.categories) result.categories = filters.categories;
    if (filters.tags) result.tags = filters.tags;
    if (filters.sourceIds) result.sourceIds = filters.sourceIds;

    return result;
  }

  /**
   * Search for similar chunks to a given chunk
   */
  async findSimilarChunks(chunkId: string, districtId: string, limit: number = 5): Promise<VectorSearchResult[]> {
    // Find similar chunks using raw SQL since embedding is a vector type
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source_id: string;
        content: string;
        metadata: Record<string, unknown>;
        similarity: number;
      }>
    >`
      SELECT 
        kc.id,
        kc.source_id,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> (SELECT embedding FROM knowledge_chunks WHERE id = ${chunkId}::uuid)) as similarity
      FROM knowledge_chunks kc
      INNER JOIN knowledge_sources ks ON kc.source_id = ks.id
      WHERE ks.district_id = ${districtId}::uuid
        AND ks.status = 'PUBLISHED'
        AND ks.deleted_at IS NULL
        AND kc.id != ${chunkId}::uuid
      ORDER BY kc.embedding <=> (SELECT embedding FROM knowledge_chunks WHERE id = ${chunkId}::uuid)
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      chunkId: r.id,
      sourceId: r.source_id,
      content: r.content,
      score: r.similarity,
      metadata: r.metadata,
    }));
  }
}
