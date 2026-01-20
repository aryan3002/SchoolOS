/**
 * Response Generator
 *
 * Generates natural language responses from tool results
 * with proper citations, formatting, and follow-up suggestions.
 *
 * @module @schoolos/ai/orchestration
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  ClassifiedIntent,
  ToolResult,
  GeneratedResponse,
  UserContext,
  ConversationContext,
  ConversationMessage,
  Citation,
  UrgencyLevel,
} from '../types';
import { ExecutionResult } from './tool-router';

// ============================================================
// CONFIGURATION
// ============================================================

export interface ResponseGeneratorConfig {
  /** Anthropic API key */
  anthropicApiKey: string;

  /** Model to use for response generation */
  model?: string;

  /** Maximum tokens in response */
  maxResponseTokens?: number;

  /** Whether to include suggested follow-ups */
  includeSuggestedFollowUps?: boolean;

  /** District-specific greeting/closing customization */
  districtBranding?: {
    greeting?: string;
    closing?: string;
    helplineInfo?: string;
  };
}

// ============================================================
// TYPES
// ============================================================

export interface GenerationContext {
  /** Classified intent */
  intent: ClassifiedIntent;

  /** Results from tool execution */
  executionResult: ExecutionResult;

  /** User context */
  userContext: UserContext;

  /** Conversation context */
  conversationContext?: ConversationContext;

  /** Previous messages for context */
  conversationHistory?: ConversationMessage[];
}

// Zod schema for structured response
const ResponseStructureSchema = z.object({
  mainResponse: z.string(),
  citations: z
    .array(
      z.object({
        sourceId: z.string(),
        sourceTitle: z.string(),
        quote: z.string().optional(),
        relevance: z.string().optional(),
      }),
    )
    .optional(),
  suggestedFollowUps: z.array(z.string()).optional(),
  clarificationNeeded: z.boolean().optional(),
  clarificationPrompt: z.string().optional(),
});

// ============================================================
// RESPONSE GENERATOR
// ============================================================

export class ResponseGenerator {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxResponseTokens: number;
  private readonly includeSuggestedFollowUps: boolean;
  private readonly districtBranding?: ResponseGeneratorConfig['districtBranding'];

  constructor(config: ResponseGeneratorConfig) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxResponseTokens = config.maxResponseTokens || 1024;
    this.includeSuggestedFollowUps = config.includeSuggestedFollowUps ?? true;
    this.districtBranding = config.districtBranding;
  }

  /**
   * Generate a response from tool execution results
   */
  async generate(context: GenerationContext): Promise<GeneratedResponse> {
    const { intent, executionResult, userContext, conversationContext, conversationHistory } =
      context;

    // Handle cases with no successful results
    if (!executionResult.allSuccessful && executionResult.toolResults.every((r) => !r.success)) {
      return this.generateFallbackResponse(intent, executionResult, userContext);
    }

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(userContext, conversationContext);

    // Build user prompt with tool results
    const userPrompt = this.buildUserPrompt(intent, executionResult, conversationHistory);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxResponseTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseAndFormatResponse(content.text, executionResult, intent);
    } catch (error) {
      console.error('Response generation failed:', error);
      return this.generateFallbackResponse(intent, executionResult, userContext);
    }
  }

  /**
   * Build system prompt for response generation
   */
  private buildSystemPrompt(
    userContext: UserContext,
    conversationContext?: ConversationContext,
  ): string {
    const roleGuidelines = this.getRoleSpecificGuidelines(userContext.role);

    return `You are a helpful school assistant for ${userContext.role.toLowerCase()}s.
Your job is to synthesize information from various school systems into clear, helpful responses.

${roleGuidelines}

Communication guidelines:
- Be warm, professional, and supportive
- Use clear, jargon-free language appropriate for the audience
- Provide specific, actionable information
- Always cite sources when referencing policies or official information
- If information is incomplete, acknowledge it and offer alternatives
- Respect privacy - never volunteer information not specifically requested
- For urgent matters, clearly communicate any time-sensitive actions

Response format:
- Keep responses concise but complete
- Use bullet points for lists of items
- Bold important dates, deadlines, or action items
- Include relevant contact information when appropriate

${this.districtBranding?.greeting ? `Opening: ${this.districtBranding.greeting}` : ''}
${this.districtBranding?.closing ? `Closing: ${this.districtBranding.closing}` : ''}

${conversationContext ? `Current conversation topic: ${conversationContext.recentTopics.join(', ')}` : ''}

Respond with a JSON object containing:
{
  "mainResponse": "The natural language response",
  "citations": [{"sourceId": "...", "sourceTitle": "...", "quote": "..."}],
  "suggestedFollowUps": ["Follow-up question 1", "Follow-up question 2"],
  "clarificationNeeded": false,
  "clarificationPrompt": null
}`;
  }

  /**
   * Get role-specific guidelines
   */
  private getRoleSpecificGuidelines(role: string): string {
    const guidelines: Record<string, string> = {
      PARENT: `For parents:
- Assume they want the best for their child
- Explain school processes that may be unfamiliar
- Proactively mention parent involvement opportunities
- Be sensitive to busy schedules`,

      STUDENT: `For students:
- Use age-appropriate language
- Be encouraging and supportive
- Help them understand expectations
- Suggest resources for academic help when relevant`,

      TEACHER: `For teachers:
- Be concise and professional
- Focus on classroom-relevant information
- Respect their expertise
- Provide actionable administrative details`,

      ADMIN: `For administrators:
- Be thorough and precise
- Include data and metrics when available
- Highlight compliance and policy considerations
- Provide decision-support information`,

      STAFF: `For staff members:
- Be clear about procedures
- Include relevant policy references
- Provide contact information for escalation`,
    };

    return guidelines[role] || guidelines.STAFF;
  }

  /**
   * Build user prompt with tool results
   */
  private buildUserPrompt(
    intent: ClassifiedIntent,
    executionResult: ExecutionResult,
    conversationHistory?: ConversationMessage[],
  ): string {
    const toolResultsText = executionResult.toolResults
      .map((result) => {
        const toolName = result.metadata?.toolName || 'unknown';
        const confidence = result.metadata?.confidence || 0;
        if (result.success) {
          return `[${toolName}] SUCCESS (confidence: ${confidence}):\n${result.content}${
            result.citations && result.citations.length > 0
              ? `\n\nCitations:\n${result.citations.map((c) => `- ${c.title}: "${c.excerpt || ''}"`).join('\n')}`
              : ''
          }`;
        } else {
          const error = result.metadata?.error || 'Unknown error';
          return `[${toolName}] FAILED: ${error}`;
        }
      })
      .join('\n\n---\n\n');

    const historyText = conversationHistory
      ? `\nRecent conversation:\n${conversationHistory
          .slice(-3)
          .map((m) => `${m.role}: ${m.content.substring(0, 200)}`)
          .join('\n')}\n`
      : '';

    return `User's question: "${intent.originalQuery || 'Unknown'}"

Intent: ${intent.category} (confidence: ${intent.confidence})
Urgency: ${intent.urgency}
Entities: ${JSON.stringify(intent.entities || {})}
${historyText}
Tool results:
${toolResultsText}

${executionResult.requiresFollowUp ? '⚠️ Human follow-up has been initiated.' : ''}
${executionResult.suggestedActions.length > 0 ? `\nSuggested actions: ${executionResult.suggestedActions.join(', ')}` : ''}

Generate a helpful response that:
1. Directly answers the user's question using the tool results
2. Includes citations for any factual claims
3. Suggests 2-3 relevant follow-up questions if appropriate
4. Indicates if clarification is needed

Respond with JSON only.`;
  }

  /**
   * Parse and format the LLM response
   */
  private parseAndFormatResponse(
    text: string,
    executionResult: ExecutionResult,
    intent: ClassifiedIntent,
  ): GeneratedResponse {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = ResponseStructureSchema.parse(JSON.parse(jsonMatch[0]));

      // Merge citations from tools and LLM response
      const allCitations = this.mergeCitations(
        executionResult.toolResults.flatMap((r) => r.citations || []),
        parsed.citations || [],
      );

      return {
        content: parsed.mainResponse,
        citations: allCitations as any,
        confidence: executionResult.combinedConfidence,
        suggestedFollowUps: this.includeSuggestedFollowUps
          ? parsed.suggestedFollowUps || []
          : [],
        requiresFollowUp: executionResult.requiresFollowUp || parsed.clarificationNeeded || false,
        metadata: {
          intent: intent.category,
          toolsUsed: executionResult.toolResults.map((r) => r.metadata?.toolName || 'unknown'),
          processingTimeMs: executionResult.totalExecutionTimeMs,
        },
      };
    } catch (error) {
      // If parsing fails, use the raw text
      return {
        content: text,
        citations: executionResult.toolResults.flatMap((r) => r.citations || []) as any,
        confidence: executionResult.combinedConfidence * 0.8, // Reduce confidence for fallback
        suggestedFollowUps: [],
        requiresFollowUp: executionResult.requiresFollowUp,
        metadata: {
          intent: intent.category,
          toolsUsed: executionResult.toolResults.map((r) => r.metadata?.toolName || 'unknown'),
          processingTimeMs: executionResult.totalExecutionTimeMs,
          parseError: true,
        },
      };
    }
  }

  /**
   * Merge citations from multiple sources
   */
  private mergeCitations(
    toolCitations: Citation[],
    llmCitations: Array<{ sourceId: string; sourceTitle: string; quote?: string }>,
  ): Citation[] {
    const citationMap = new Map<string, Citation>();

    // Add tool citations first (they're more authoritative)
    for (const citation of toolCitations) {
      citationMap.set(citation.sourceId, citation);
    }

    // Add LLM citations if not duplicates
    for (const citation of llmCitations) {
      if (!citationMap.has(citation.sourceId)) {
        citationMap.set(citation.sourceId, {
          sourceId: citation.sourceId,
          sourceTitle: citation.sourceTitle,
          quote: citation.quote,
        });
      }
    }

    return Array.from(citationMap.values());
  }

  /**
   * Generate fallback response when tools fail
   */
  private generateFallbackResponse(
    intent: ClassifiedIntent,
    executionResult: ExecutionResult,
    userContext: UserContext,
  ): GeneratedResponse {
    const errorMessages = executionResult.toolResults
      .filter((r) => !r.success)
      .map((r) => r.metadata?.error)
      .filter(Boolean);

    // Determine appropriate fallback message
    let content: string;

    if (intent.urgency === 'high') {
      content =
        "I'm having difficulty retrieving the information you need right now. " +
        'Given the urgency of your request, I recommend contacting the school office directly.\n\n' +
        (this.districtBranding?.helplineInfo ||
          'Please call your school\'s main office for immediate assistance.');
    } else if (errorMessages.some((e) => e?.includes('ACCESS_DENIED'))) {
      content =
        "I'm unable to access that information with your current permissions. " +
        'If you believe you should have access, please contact the school administration.';
    } else if (errorMessages.some((e) => e?.includes('NO_STUDENT'))) {
      content =
        "I need to know which student you're asking about. " +
        'Could you please specify the student name or clarify your question?';
    } else {
      content =
        "I apologize, but I'm having trouble finding that information right now. " +
        'You might try:\n' +
        '- Rephrasing your question\n' +
        '- Checking the school website directly\n' +
        '- Contacting the school office\n\n' +
        'Is there something else I can help you with?';
    }

    return {
      content,
      citations: [],
      confidence: 0.3,
      suggestedFollowUps: [
        'Can I help you with something else?',
        'Would you like me to connect you with a staff member?',
      ],
      requiresFollowUp: true,
      metadata: {
        intent: intent.category,
        toolsUsed: executionResult.toolResults.map((r) => r.metadata?.toolName || 'unknown'),
        processingTimeMs: executionResult.totalExecutionTimeMs,
        fallback: true,
        errors: errorMessages,
      },
    };
  }

  /**
   * Generate a simple response without tool results (for greetings, etc.)
   */
  async generateSimple(
    message: string,
    userContext: UserContext,
    conversationContext?: ConversationContext,
  ): Promise<GeneratedResponse> {
    const systemPrompt = `You are a helpful school assistant. 
Be friendly, concise, and helpful. 
User role: ${userContext.role}
${conversationContext ? `Recent topics: ${conversationContext.recentTopics.join(', ')}` : ''}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return {
        content: content.text,
        citations: [],
        confidence: 0.9,
        suggestedFollowUps: [],
        requiresFollowUp: false,
        metadata: {
          intent: 'GREETING',
          toolsUsed: [],
          processingTimeMs: 0,
        },
      };
    } catch (error) {
      return {
        content: 'Hello! How can I help you today?',
        citations: [],
        confidence: 0.5,
        suggestedFollowUps: [],
        requiresFollowUp: false,
        metadata: {
          intent: 'GREETING',
          toolsUsed: [],
          processingTimeMs: 0,
          error: true,
        },
      };
    }
  }
}
