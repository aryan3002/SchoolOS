/**
 * Knowledge Retrieval Tool
 *
 * Retrieves relevant information from the district knowledge base
 * using hybrid search (vector + keyword).
 *
 * @module @schoolos/ai/tools
 */

import {
  ToolDefinition,
  ToolParams,
  ToolResult,
  Permission,
  IntentCategory,
  Citation,
} from '../types';
import { BaseTool } from './base-tool';

// ============================================================
// TYPES
// ============================================================

export interface KnowledgeRetrievalParams extends ToolParams {
  /** Override query (defaults to original query) */
  query?: string;

  /** Filter by document types */
  documentTypes?: string[];

  /** Filter by categories */
  categories?: string[];

  /** Maximum results to return */
  limit?: number;

  /** Minimum relevance score (0-1) */
  minScore?: number;
}

export interface KnowledgeSearchService {
  search(options: {
    query: string;
    districtId: string;
    limit: number;
    filters?: {
      sourceTypes?: string[];
      categories?: string[];
    };
    minScore?: number;
  }): Promise<{
    results: Array<{
      id: string;
      sourceId: string;
      sourceTitle: string;
      sourceType: string;
      content: string;
      relevanceScore: number;
      metadata: {
        page?: number;
        section?: string;
        headers?: string[];
      };
    }>;
    total: number;
    timing: {
      totalMs: number;
    };
  }>;
}

// ============================================================
// KNOWLEDGE RETRIEVAL TOOL
// ============================================================

export class KnowledgeRetrievalTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'knowledge_retrieval',
    description:
      'Retrieves relevant information from district documents, policies, handbooks, and FAQs',
    requiredPermissions: [Permission.READ_KNOWLEDGE],
    handlesIntents: [
      IntentCategory.POLICY_QUESTION,
      IntentCategory.GENERAL_INFO,
      IntentCategory.OPERATIONAL,
      IntentCategory.CALENDAR_QUERY,
      IntentCategory.ADMINISTRATIVE,
    ],
    timeoutMs: 10000,
  };

  constructor(private readonly searchService: KnowledgeSearchService) {
    super();
  }

  protected async executeImpl(
    params: KnowledgeRetrievalParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    const {
      query = params.intent.originalQuery,
      documentTypes,
      categories,
      limit = 5,
      minScore = 0.5,
      context,
    } = params;

    // Execute search
    const searchResults = await this.searchService.search({
      query,
      districtId: context.districtId,
      limit,
      filters: {
        sourceTypes: documentTypes,
        categories,
      },
      minScore,
    });

    if (searchResults.results.length === 0) {
      return {
        success: true,
        content: 'No relevant information found in the knowledge base.',
        confidence: 0.3,
      };
    }

    // Build content from results
    const contentParts: string[] = [];
    const citations: Citation[] = [];

    for (const result of searchResults.results) {
      contentParts.push(
        `[Source: ${result.sourceTitle}]\n${result.content}\n---`,
      );

      citations.push({
        sourceId: result.sourceId,
        chunkId: result.id,
        title: result.sourceTitle,
        quote: result.content.substring(0, 200),
        page: result.metadata.page,
        section: result.metadata.section,
      });
    }

    const avgScore =
      searchResults.results.reduce((sum, r) => sum + r.relevanceScore, 0) /
      searchResults.results.length;

    return this.createSuccessResult(contentParts.join('\n\n'), {
      data: {
        resultCount: searchResults.results.length,
        totalAvailable: searchResults.total,
        searchTimeMs: searchResults.timing.totalMs,
      },
      source: {
        id: searchResults.results[0]?.sourceId || '',
        title: searchResults.results[0]?.sourceTitle || '',
        type: searchResults.results[0]?.sourceType || '',
        relevanceScore: searchResults.results[0]?.relevanceScore,
      },
      confidence: Math.min(avgScore + 0.1, 1), // Boost confidence slightly
      citations,
    });
  }
}
