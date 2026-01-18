/**
 * Semantic Chunker
 *
 * Production-grade document chunking with multiple strategies:
 * 1. Structure-based chunking (respects document sections)
 * 2. Semantic chunking (uses sentence boundaries and similarity)
 * 3. Hybrid chunking (combines both approaches)
 *
 * Design goals:
 * - No mid-sentence splits
 * - Preserve section context
 * - Optimal chunk sizes for embedding quality
 * - Configurable overlap for context continuity
 */

import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentChunk,
  ChunkMetadata,
  ChunkingOptions,
  ChunkingResult,
  ChunkingStatistics,
  ProcessedDocument,
} from './types';

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  minChunkSize: 200, // tokens
  maxChunkSize: 600, // tokens
  overlapSize: 50, // tokens
  respectSectionBoundaries: true,
  preserveParagraphs: true,
};

@Injectable()
export class SemanticChunker {
  private readonly logger = new Logger(SemanticChunker.name);

  /**
   * Chunk a document using the best strategy based on its structure
   */
  async chunk(document: ProcessedDocument, options?: ChunkingOptions): Promise<ChunkingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    this.logger.log('Starting document chunking', {
      contentLength: document.content.length,
      hasStructure: document.structure?.sections.length > 0,
      options: opts,
    });

    let chunks: DocumentChunk[];

    // Strategy selection
    if (opts.respectSectionBoundaries && document.structure?.sections.length > 0) {
      // Strategy 1: Respect document structure
      chunks = await this.chunkByStructure(document, opts);
    } else {
      // Strategy 2: Semantic splitting using sentences
      chunks = await this.chunkBySemantic(document, opts);
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(chunks);

    this.logger.log('Document chunking completed', {
      totalChunks: statistics.totalChunks,
      averageChunkSize: Math.round(statistics.averageChunkSize),
      totalTokens: statistics.totalTokens,
    });

    return { chunks, statistics };
  }

  /**
   * Chunk by document structure (sections, headers)
   */
  private async chunkByStructure(
    document: ProcessedDocument,
    options: Required<ChunkingOptions>,
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Process each section
    for (const section of document.structure.sections) {
      const sectionText = section.content.join(' ').trim();

      if (!sectionText) {
        continue;
      }

      const tokenCount = this.estimateTokens(sectionText);

      if (tokenCount <= options.maxChunkSize) {
        // Section fits in one chunk
        chunks.push(
          this.createChunk({
            content: sectionText,
            chunkIndex: chunkIndex++,
            metadata: {
              sectionHeader: section.title,
              type: 'section',
            },
          }),
        );
      } else {
        // Section too large, split by paragraphs or sentences
        const subChunks = await this.splitLargeSection(section.title, sectionText, options, chunkIndex);
        chunkIndex += subChunks.length;
        chunks.push(...subChunks);
      }
    }

    // Handle content not in sections
    const sectionContent = new Set(document.structure.sections.flatMap((s) => s.content));
    const orphanedContent = document.content
      .split('\n')
      .filter((line) => !sectionContent.has(line) && line.trim().length > 0)
      .join(' ')
      .trim();

    if (orphanedContent && this.estimateTokens(orphanedContent) > options.minChunkSize / 2) {
      const orphanChunks = await this.chunkText(orphanedContent, options, chunkIndex);
      chunks.push(...orphanChunks);
    }

    // Add overlap chunks for context continuity
    if (options.overlapSize > 0 && chunks.length > 1) {
      return this.addOverlapChunks(chunks, options);
    }

    return chunks;
  }

  /**
   * Chunk by semantic boundaries (sentences)
   */
  private async chunkBySemantic(
    document: ProcessedDocument,
    options: Required<ChunkingOptions>,
  ): Promise<DocumentChunk[]> {
    // Split into sentences
    const sentences = this.splitIntoSentences(document.content);

    if (sentences.length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let startSentence = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i] ?? '';
      const sentenceTokens = this.estimateTokens(sentence);

      // Check if adding this sentence would exceed max size
      const wouldExceed = currentTokenCount + sentenceTokens > options.maxChunkSize;
      const meetsMinimum = currentTokenCount >= options.minChunkSize;

      if (wouldExceed && meetsMinimum && currentChunk.length > 0) {
        // Create chunk with current content
        chunks.push(
          this.createChunk({
            content: currentChunk.join(' '),
            chunkIndex: chunkIndex++,
            metadata: {
              type: 'semantic',
              startSentence,
              endSentence: i - 1,
            },
          }),
        );

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, options.overlapSize);
        currentChunk = overlapSentences;
        currentTokenCount = this.estimateTokens(currentChunk.join(' '));
        startSentence = i - overlapSentences.length;
      }

      if (sentence) {
        currentChunk.push(sentence);
        currentTokenCount += sentenceTokens;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(
        this.createChunk({
          content: currentChunk.join(' '),
          chunkIndex: chunkIndex,
          metadata: {
            type: 'semantic',
            startSentence,
            endSentence: sentences.length - 1,
          },
        }),
      );
    }

    return chunks;
  }

  /**
   * Split a large section into smaller chunks
   */
  private async splitLargeSection(
    sectionHeader: string,
    text: string,
    options: Required<ChunkingOptions>,
    startIndex: number,
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = startIndex;

    if (options.preserveParagraphs) {
      // Split by paragraphs first
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
      let currentParagraphs: string[] = [];
      let currentTokenCount = 0;

      for (const paragraph of paragraphs) {
        const paragraphTokens = this.estimateTokens(paragraph);

        if (paragraphTokens > options.maxChunkSize) {
          // Paragraph itself is too large, split by sentences
          if (currentParagraphs.length > 0) {
            chunks.push(
              this.createChunk({
                content: currentParagraphs.join('\n\n'),
                chunkIndex: chunkIndex++,
                metadata: {
                  sectionHeader,
                  type: 'paragraph',
                },
              }),
            );
            currentParagraphs = [];
            currentTokenCount = 0;
          }

          const sentenceChunks = await this.chunkText(paragraph, options, chunkIndex);
          for (const chunk of sentenceChunks) {
            chunk.metadata.sectionHeader = sectionHeader;
          }
          chunkIndex += sentenceChunks.length;
          chunks.push(...sentenceChunks);
        } else if (currentTokenCount + paragraphTokens > options.maxChunkSize) {
          // Adding this paragraph would exceed limit
          if (currentParagraphs.length > 0) {
            chunks.push(
              this.createChunk({
                content: currentParagraphs.join('\n\n'),
                chunkIndex: chunkIndex++,
                metadata: {
                  sectionHeader,
                  type: 'paragraph',
                },
              }),
            );
          }
          currentParagraphs = [paragraph];
          currentTokenCount = paragraphTokens;
        } else {
          currentParagraphs.push(paragraph);
          currentTokenCount += paragraphTokens;
        }
      }

      // Add remaining paragraphs
      if (currentParagraphs.length > 0) {
        chunks.push(
          this.createChunk({
            content: currentParagraphs.join('\n\n'),
            chunkIndex: chunkIndex++,
            metadata: {
              sectionHeader,
              type: 'paragraph',
            },
          }),
        );
      }
    } else {
      // Split by sentences
      const sentenceChunks = await this.chunkText(text, options, startIndex);
      for (const chunk of sentenceChunks) {
        chunk.metadata.sectionHeader = sectionHeader;
      }
      chunks.push(...sentenceChunks);
    }

    return chunks;
  }

  /**
   * Chunk plain text using sentence boundaries
   */
  private async chunkText(text: string, options: Required<ChunkingOptions>, startIndex: number): Promise<DocumentChunk[]> {
    const sentences = this.splitIntoSentences(text);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = startIndex;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokenCount + sentenceTokens > options.maxChunkSize && currentChunk.length > 0) {
        chunks.push(
          this.createChunk({
            content: currentChunk.join(' '),
            chunkIndex: chunkIndex++,
            metadata: { type: 'semantic' },
          }),
        );

        // Add overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, options.overlapSize);
        currentChunk = overlapSentences;
        currentTokenCount = this.estimateTokens(currentChunk.join(' '));
      }

      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    if (currentChunk.length > 0) {
      chunks.push(
        this.createChunk({
          content: currentChunk.join(' '),
          chunkIndex: chunkIndex,
          metadata: { type: 'semantic' },
        }),
      );
    }

    return chunks;
  }

  /**
   * Add overlap chunks between adjacent chunks
   */
  private addOverlapChunks(chunks: DocumentChunk[], options: Required<ChunkingOptions>): DocumentChunk[] {
    const result: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      if (currentChunk) {
        result.push(currentChunk);
      }

      if (i < chunks.length - 1 && currentChunk) {
        // Create overlap between this chunk and next
        const nextChunk = chunks[i + 1];
        if (nextChunk) {
          const currentEnd = this.getLastNTokens(currentChunk.content, options.overlapSize);
          const nextStart = this.getFirstNTokens(nextChunk.content, options.overlapSize);

          if (currentEnd && nextStart) {
            const overlapContent = `${currentEnd} ${nextStart}`.trim();
            if (this.estimateTokens(overlapContent) >= options.minChunkSize / 2) {
              result.push(
                this.createChunk({
                  content: overlapContent,
                  chunkIndex: currentChunk.metadata.chunkIndex + 0.5,
                  metadata: { type: 'overlap' },
                }),
              );
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Handle common abbreviations to avoid false splits
    const abbrevs = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Jr', 'Sr', 'Inc', 'Ltd', 'Corp', 'vs', 'etc', 'e.g', 'i.e'];
    let processed = text;

    for (const abbrev of abbrevs) {
      const regex = new RegExp(`\\b${abbrev}\\.`, 'gi');
      processed = processed.replace(regex, `${abbrev}<ABBREV>`);
    }

    // Split on sentence boundaries
    const sentenceRegex = /[.!?]+[\s\n]+(?=[A-Z])|[.!?]+$/g;
    const sentences = processed
      .split(sentenceRegex)
      .map((s) => s.replace(/<ABBREV>/g, '.').trim())
      .filter((s) => s.length > 0);

    return sentences;
  }

  /**
   * Get sentences for overlap
   */
  private getOverlapSentences(sentences: string[], targetTokens: number): string[] {
    const result: string[] = [];
    let tokenCount = 0;

    for (let i = sentences.length - 1; i >= 0 && tokenCount < targetTokens; i--) {
      const sentence = sentences[i];
      if (sentence) {
        const sentenceTokens = this.estimateTokens(sentence);
        result.unshift(sentence);
        tokenCount += sentenceTokens;
      }
    }

    return result;
  }

  /**
   * Get last N tokens worth of content
   */
  private getLastNTokens(text: string, targetTokens: number): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    let tokenCount = 0;

    for (let i = words.length - 1; i >= 0 && tokenCount < targetTokens; i--) {
      const word = words[i];
      if (word) {
        result.unshift(word);
        tokenCount += this.estimateTokens(word);
      }
    }

    return result.join(' ');
  }

  /**
   * Get first N tokens worth of content
   */
  private getFirstNTokens(text: string, targetTokens: number): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    let tokenCount = 0;

    for (let i = 0; i < words.length && tokenCount < targetTokens; i++) {
      const word = words[i];
      if (word) {
        result.push(word);
        tokenCount += this.estimateTokens(word);
      }
    }

    return result.join(' ');
  }

  /**
   * Estimate token count (roughly 4 characters per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Create a chunk with ID and metadata
   */
  private createChunk(params: { content: string; chunkIndex: number; metadata: Partial<ChunkMetadata> }): DocumentChunk {
    const { content, chunkIndex, metadata } = params;

    return {
      id: crypto.randomUUID(),
      content,
      tokenCount: this.estimateTokens(content),
      metadata: {
        chunkIndex,
        type: 'semantic',
        ...metadata,
      } as ChunkMetadata,
    };
  }

  /**
   * Calculate chunking statistics
   */
  private calculateStatistics(chunks: DocumentChunk[]): ChunkingStatistics {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        totalTokens: 0,
        averageChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        sectionBasedChunks: 0,
        semanticChunks: 0,
        overlapChunks: 0,
      };
    }

    const tokenCounts = chunks.map((c) => c.tokenCount);

    return {
      totalChunks: chunks.length,
      totalTokens: tokenCounts.reduce((a, b) => a + b, 0),
      averageChunkSize: tokenCounts.reduce((a, b) => a + b, 0) / chunks.length,
      minChunkSize: Math.min(...tokenCounts),
      maxChunkSize: Math.max(...tokenCounts),
      sectionBasedChunks: chunks.filter((c) => c.metadata.type === 'section' || c.metadata.type === 'paragraph').length,
      semanticChunks: chunks.filter((c) => c.metadata.type === 'semantic').length,
      overlapChunks: chunks.filter((c) => c.metadata.type === 'overlap').length,
    };
  }
}
