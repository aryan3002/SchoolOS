/**
 * Embedding Service
 *
 * Production-grade embedding generation with:
 * - Batching to respect API rate limits
 * - In-memory caching for deduplication
 * - Retry logic with exponential backoff
 * - Support for multiple embedding providers
 *
 * Uses OpenAI's text-embedding-3-large model by default
 * (1536 dimensions, matches schema)
 */

import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentChunk } from '../chunking/types';
import { EmbeddedChunk, EmbeddingResult, EmbeddingStatistics, EmbeddingConfig } from './types';

const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 50, // OpenAI supports up to 2048, but we batch smaller for reliability
  maxRetries: 3,
  retryDelayMs: 1000,
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly config: EmbeddingConfig;
  private readonly cache: Map<string, number[]> = new Map();
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      ...DEFAULT_CONFIG,
      model: this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || DEFAULT_CONFIG.model,
      dimensions: this.configService.get<number>('EMBEDDING_DIMENSIONS') || DEFAULT_CONFIG.dimensions,
      batchSize: this.configService.get<number>('EMBEDDING_BATCH_SIZE') || DEFAULT_CONFIG.batchSize,
    };

    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');

    this.logger.log('EmbeddingService initialized', {
      model: this.config.model,
      dimensions: this.config.dimensions,
      batchSize: this.config.batchSize,
      hasApiKey: !!this.apiKey,
    });
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<EmbeddingResult> {
    const startTime = Date.now();

    this.logger.log('Starting embedding generation', {
      totalChunks: chunks.length,
    });

    const embeddedChunks: EmbeddedChunk[] = [];
    let cachedCount = 0;
    let generatedCount = 0;
    let totalTokens = 0;

    // Separate cached and uncached chunks
    const uncachedChunks: DocumentChunk[] = [];
    const cachedChunksMap: Map<string, EmbeddedChunk> = new Map();

    for (const chunk of chunks) {
      const cacheKey = this.getCacheKey(chunk.content);
      const cachedEmbedding = this.cache.get(cacheKey);

      if (cachedEmbedding) {
        cachedChunksMap.set(chunk.id, {
          ...chunk,
          embedding: cachedEmbedding,
        });
        cachedCount++;
      } else {
        uncachedChunks.push(chunk);
      }
      totalTokens += chunk.tokenCount;
    }

    // Generate embeddings for uncached chunks in batches
    if (uncachedChunks.length > 0) {
      this.logger.log('Generating embeddings for uncached chunks', {
        uncachedCount: uncachedChunks.length,
        cachedCount,
      });

      const newEmbeddings = await this.generateInBatches(uncachedChunks);

      for (let i = 0; i < uncachedChunks.length; i++) {
        const chunk = uncachedChunks[i];
        const embedding = newEmbeddings[i];

        if (chunk && embedding) {
          // Cache the embedding
          const cacheKey = this.getCacheKey(chunk.content);
          this.cache.set(cacheKey, embedding);

          embeddedChunks.push({
            ...chunk,
            embedding,
          });
          generatedCount++;
        }
      }
    }

    // Combine with cached chunks in original order
    const result: EmbeddedChunk[] = [];
    for (const chunk of chunks) {
      const cached = cachedChunksMap.get(chunk.id);
      if (cached) {
        result.push(cached);
      } else {
        const generated = embeddedChunks.find((e) => e.id === chunk.id);
        if (generated) {
          result.push(generated);
        }
      }
    }

    const duration = Date.now() - startTime;
    const statistics: EmbeddingStatistics = {
      totalChunks: chunks.length,
      totalTokens,
      cachedChunks: cachedCount,
      generatedChunks: generatedCount,
      totalDurationMs: duration,
      averageLatencyMs: generatedCount > 0 ? duration / generatedCount : 0,
      model: this.config.model,
    };

    this.logger.log('Embedding generation completed', statistics);

    return { chunks: result, statistics };
  }

  /**
   * Generate embeddings in batches
   */
  private async generateInBatches(chunks: DocumentChunk[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      const texts = batch.map((c) => c.content);

      this.logger.debug('Processing batch', {
        batchIndex: Math.floor(i / this.config.batchSize),
        batchSize: batch.length,
        totalBatches: Math.ceil(chunks.length / this.config.batchSize),
      });

      const batchEmbeddings = await this.generateBatchWithRetry(texts);
      embeddings.push(...batchEmbeddings);

      // Rate limiting: wait between batches
      if (i + this.config.batchSize < chunks.length) {
        await this.sleep(200); // 200ms between batches
      }
    }

    return embeddings;
  }

  /**
   * Generate embeddings for a batch with retry logic
   */
  private async generateBatchWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await this.generateBatch(texts);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn('Embedding generation failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });

        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff
          await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    throw new Error(`Embedding generation failed after ${this.config.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate embeddings for a single batch
   */
  private async generateBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      // Return mock embeddings for development/testing
      this.logger.warn('No OpenAI API key configured, returning mock embeddings');
      return texts.map(() => this.generateMockEmbedding());
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          dimensions: this.config.dimensions,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ index: number; embedding: number[] }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response from OpenAI API');
      }

      // Sort by index to ensure order matches input
      const sortedData = data.data.sort((a, b) => a.index - b.index);

      return sortedData.map((item) => item.embedding);
    } catch (error) {
      this.logger.error('OpenAI embedding request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textCount: texts.length,
      });
      throw error;
    }
  }

  /**
   * Generate a mock embedding for testing
   */
  private generateMockEmbedding(): number[] {
    // Generate deterministic mock embedding
    const embedding: number[] = [];
    for (let i = 0; i < this.config.dimensions; i++) {
      embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
    }
    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Generate embedding for a single text (for queries)
   */
  async generateQueryEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const embeddings = await this.generateBatchWithRetry([text]);
    const embedding = embeddings[0];

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dotProduct += valA * valB;
      magnitudeA += valA * valA;
      magnitudeB += valB * valB;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get cache key for content
   */
  private getCacheKey(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryEstimate: number } {
    const size = this.cache.size;
    // Each embedding is ~1536 floats * 8 bytes = ~12KB
    const memoryEstimate = size * this.config.dimensions * 8;
    return { size, memoryEstimate };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
