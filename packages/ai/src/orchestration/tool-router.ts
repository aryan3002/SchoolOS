/**
 * Tool Router
 *
 * Routes classified intents to appropriate tools and manages
 * tool execution with fallback strategies.
 *
 * @module @schoolos/ai/orchestration
 */

import OpenAI from 'openai';
import { z } from 'zod';
import {
  ClassifiedIntent,
  IntentCategory,
  ToolSelection,
  ToolResult,
  ToolParams,
  UserContext,
  ConversationContext,
  ConversationMessage,
  UrgencyLevel,
  EscalationReason,
} from '../types';
import { BaseTool, ToolRegistry } from '../tools/base-tool';

// ============================================================
// CONFIGURATION
// ============================================================

export interface ToolRouterConfig {
  /** OpenAI API key */
  openaiApiKey: string;

  /** Model to use for tool selection reasoning */
  model?: string;

  /** Maximum tools to execute per request */
  maxToolsPerRequest?: number;

  /** Whether to enable parallel tool execution */
  enableParallelExecution?: boolean;

  /** Global timeout for tool execution */
  executionTimeoutMs?: number;
}

// ============================================================
// TYPES
// ============================================================

export interface RoutingResult {
  /** Tools selected for execution */
  selectedTools: ToolSelection[];

  /** Reasoning for tool selection */
  reasoning: string;

  /** Whether escalation is needed */
  requiresEscalation: boolean;

  /** Escalation reason if needed */
  escalationReason?: EscalationReason;
}

export interface ExecutionResult {
  /** Results from all executed tools */
  toolResults: ToolResult[];

  /** Whether all tools executed successfully */
  allSuccessful: boolean;

  /** Overall confidence */
  combinedConfidence: number;

  /** Total execution time */
  totalExecutionTimeMs: number;

  /** Whether human follow-up is needed */
  requiresFollowUp: boolean;

  /** Suggested actions from tools */
  suggestedActions: string[];
}

// Zod schema for tool selection response
const ToolSelectionResponseSchema = z.object({
  selectedTools: z.array(
    z.object({
      toolName: z.string(),
      reasoning: z.string(),
      priority: z.number().min(1).max(10),
      parameters: z.record(z.unknown()).optional(),
    }),
  ),
  overallReasoning: z.string(),
  shouldEscalate: z.boolean(),
  escalationReason: z.string().optional(),
});

// ============================================================
// TOOL ROUTER
// ============================================================

export class ToolRouter {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxToolsPerRequest: number;
  private readonly enableParallelExecution: boolean;
  private readonly executionTimeoutMs: number;

  constructor(
    private readonly registry: ToolRegistry,
    config: ToolRouterConfig,
  ) {
    this.client = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = config.model || 'gpt-4.1-mini';
    this.maxToolsPerRequest = config.maxToolsPerRequest || 3;
    this.enableParallelExecution = config.enableParallelExecution ?? true;
    this.executionTimeoutMs = config.executionTimeoutMs || 30000;
  }

  /**
   * Route an intent to appropriate tools
   */
  async route(
    intent: ClassifiedIntent,
    context: UserContext,
    conversationContext?: ConversationContext,
  ): Promise<RoutingResult> {
    // Check for mandatory escalation scenarios
    const mandatoryEscalation = this.checkMandatoryEscalation(intent);
    if (mandatoryEscalation) {
      return mandatoryEscalation;
    }

    // Get tools that can handle this intent
    const candidateTools = this.registry.getToolsForIntent(intent.category);

    // Filter by user permissions
    const accessibleTools = candidateTools.filter((tool) => tool.canExecute(context));

    // If no tools available, escalate
    if (accessibleTools.length === 0) {
      return {
        selectedTools: [],
        reasoning: 'No tools available for this intent with current user permissions',
        requiresEscalation: true,
        escalationReason: EscalationReason.TECHNICAL_ERROR,
      };
    }

    // For simple intents with single tool match, skip LLM reasoning
    if (this.isSimpleRouting(intent, accessibleTools)) {
      return this.createSimpleRouting(intent, accessibleTools[0]);
    }

    // Use LLM for complex routing decisions
    return this.routeWithLLM(intent, accessibleTools, context, conversationContext);
  }

  /**
   * Execute selected tools and aggregate results
   */
  async execute(
    routing: RoutingResult,
    intent: ClassifiedIntent,
    context: UserContext,
    conversationHistory?: ConversationMessage[],
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Handle escalation-only routing
    if (routing.requiresEscalation && routing.selectedTools.length === 0) {
      const escalationTool = this.registry.getTool('escalation');
      if (escalationTool) {
        const result = await this.executeToolWithTimeout(
          escalationTool,
          {
            context,
            intent,
            conversationHistory,
            reason: routing.escalationReason,
          } as ToolParams,
          escalationTool.definition.timeoutMs || 5000,
        );

        return {
          toolResults: [result],
          allSuccessful: result.success,
          combinedConfidence: result.confidence,
          totalExecutionTimeMs: Date.now() - startTime,
          requiresFollowUp: true,
          suggestedActions: result.suggestedActions || [],
        };
      }
    }

    // Execute selected tools
    const toolResults = this.enableParallelExecution
      ? await this.executeToolsParallel(routing.selectedTools, intent, context, conversationHistory)
      : await this.executeToolsSequential(routing.selectedTools, intent, context, conversationHistory);

    // If escalation was also requested, add escalation result
    if (routing.requiresEscalation && routing.escalationReason) {
      const escalationTool = this.registry.getTool('escalation');
      if (escalationTool) {
        const escalationResult = await this.executeToolWithTimeout(
          escalationTool,
          {
            context,
            intent,
            conversationHistory,
            reason: routing.escalationReason,
          } as ToolParams,
          5000,
        );
        toolResults.push(escalationResult);
      }
    }

    // Aggregate results
    const allSuccessful = toolResults.every((r) => r.success);
    const combinedConfidence = this.calculateCombinedConfidence(toolResults);
    const suggestedActions = toolResults.flatMap((r) => r.suggestedActions || []);
    const requiresFollowUp = toolResults.some((r) => r.requiresFollowUp);

    return {
      toolResults,
      allSuccessful,
      combinedConfidence,
      totalExecutionTimeMs: Date.now() - startTime,
      requiresFollowUp: requiresFollowUp || routing.requiresEscalation,
      suggestedActions: [...new Set(suggestedActions)],
    };
  }

  /**
   * Check for mandatory escalation scenarios
   */
  private checkMandatoryEscalation(intent: ClassifiedIntent): RoutingResult | null {
    // Emergency intents always escalate
    if (intent.category === IntentCategory.EMERGENCY) {
      return {
        selectedTools: [],
        reasoning: 'Emergency situation detected - immediate escalation required',
        requiresEscalation: true,
        escalationReason: EscalationReason.EMERGENCY,
      };
    }

    // High urgency with safety concern escalates
    if (intent.urgency === 'high' && intent.shouldEscalate) {
      return {
        selectedTools: [],
        reasoning: 'High urgency with safety concern - escalating to human agent',
        requiresEscalation: true,
        escalationReason: EscalationReason.STUDENT_SAFETY,
      };
    }

    // Very low confidence should escalate
    if (intent.confidence < 0.3) {
      return {
        selectedTools: [],
        reasoning: 'Low confidence in intent classification - escalating for human review',
        requiresEscalation: true,
        escalationReason: EscalationReason.LOW_CONFIDENCE,
      };
    }

    return null;
  }

  /**
   * Determine if simple routing can be used
   */
  private isSimpleRouting(intent: ClassifiedIntent, tools: BaseTool[]): boolean {
    // Single tool that handles this intent specifically
    if (tools.length === 1) {
      return true;
    }

    // High confidence intent with clear primary tool
    if (intent.confidence > 0.85 && intent.category !== IntentCategory.GENERAL) {
      const primaryTools = tools.filter((t) =>
        t.definition.handlesIntents.includes(intent.category),
      );
      return primaryTools.length === 1;
    }

    return false;
  }

  /**
   * Create simple routing result without LLM
   */
  private createSimpleRouting(intent: ClassifiedIntent, tool: BaseTool): RoutingResult {
    return {
      selectedTools: [
        {
          toolName: tool.definition.name,
          reasoning: `Direct routing: ${tool.definition.name} handles ${intent.category}`,
          priority: 1,
          parameters: {},
        },
      ],
      reasoning: `Single tool match for ${intent.category}`,
      requiresEscalation: false,
    };
  }

  /**
   * Use LLM for complex routing decisions
   */
  private async routeWithLLM(
    intent: ClassifiedIntent,
    tools: BaseTool[],
    context: UserContext,
    conversationContext?: ConversationContext,
  ): Promise<RoutingResult> {
    const toolDescriptions = tools.map((t) => ({
      name: t.definition.name,
      description: t.definition.description,
      handlesIntents: t.definition.handlesIntents,
      requiresStudentContext: t.definition.requiresStudentContext,
    }));

    const systemPrompt = `You are a tool routing assistant for a school management system.
Your job is to select the best tools to handle user requests.

Available tools:
${JSON.stringify(toolDescriptions, null, 2)}

User context:
- Role: ${context.role}
- Has children: ${(context.childIds?.length ?? 0) > 0}

Rules:
1. Select tools that can best answer the user's question
2. Use multiple tools only when they provide complementary information
3. Prioritize tools from 1 (highest) to 10 (lowest)
4. Recommend escalation if the query requires human judgment
5. Never select more than ${this.maxToolsPerRequest} tools`;

    const userPrompt = `User query: "${intent.originalQuery}"
Intent category: ${intent.category}
Confidence: ${intent.confidence}
Entities: ${JSON.stringify(intent.entities)}
Urgency: ${intent.urgencyLevel}
${conversationContext ? `Recent conversation topic: ${conversationContext.recentTopics.join(', ')}` : ''}

Select the appropriate tool(s) and provide reasoning. Respond with JSON only.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response from OpenAI');
      }

      // Parse and validate response
      const parsed = this.parseToolSelectionResponse(content);

      return {
        selectedTools: parsed.selectedTools
          .filter((s) => tools.some((t) => t.definition.name === s.toolName))
          .slice(0, this.maxToolsPerRequest),
        reasoning: parsed.overallReasoning,
        requiresEscalation: parsed.shouldEscalate,
        escalationReason: parsed.escalationReason
          ? (parsed.escalationReason as EscalationReason)
          : undefined,
      };
    } catch (error) {
      // Fallback to simple heuristic routing
      console.error('LLM routing failed, using fallback:', error);
      return this.fallbackRouting(intent, tools);
    }
  }

  /**
   * Parse tool selection response from LLM
   */
  private parseToolSelectionResponse(text: string): z.infer<typeof ToolSelectionResponseSchema> {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ToolSelectionResponseSchema.parse(parsed);
  }

  /**
   * Fallback routing when LLM fails
   */
  private fallbackRouting(intent: ClassifiedIntent, tools: BaseTool[]): RoutingResult {
    // Find tools that handle this intent category
    const matchingTools = tools.filter((t) =>
      t.definition.handlesIntents.includes(intent.category),
    );

    if (matchingTools.length > 0) {
      return {
        selectedTools: matchingTools.slice(0, this.maxToolsPerRequest).map((t, i) => ({
          toolName: t.definition.name,
          reasoning: `Fallback: tool handles ${intent.category}`,
          priority: i + 1,
          parameters: {},
        })),
        reasoning: 'Fallback routing based on intent category',
        requiresEscalation: intent.confidence < 0.5,
        escalationReason:
          intent.confidence < 0.5 ? EscalationReason.LOW_CONFIDENCE : undefined,
      };
    }

    // No matching tools - escalate
    return {
      selectedTools: [],
      reasoning: 'No tools match the intent category',
      requiresEscalation: true,
      escalationReason: EscalationReason.COMPLEX_QUERY,
    };
  }

  /**
   * Execute tools in parallel
   */
  private async executeToolsParallel(
    selections: ToolSelection[],
    intent: ClassifiedIntent,
    context: UserContext,
    conversationHistory?: ConversationMessage[],
  ): Promise<ToolResult[]> {
    const promises = selections.map(async (selection) => {
      const tool = this.registry.getTool(selection.toolName);
      if (!tool) {
        return this.createToolNotFoundResult(selection.toolName);
      }

      const params: ToolParams = {
        context,
        intent,
        conversationHistory,
        ...selection.parameters,
      };

      return this.executeToolWithTimeout(tool, params, tool.definition.timeoutMs || 10000);
    });

    return Promise.all(promises);
  }

  /**
   * Execute tools sequentially
   */
  private async executeToolsSequential(
    selections: ToolSelection[],
    intent: ClassifiedIntent,
    context: UserContext,
    conversationHistory?: ConversationMessage[],
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const selection of selections) {
      const tool = this.registry.getTool(selection.toolName);
      if (!tool) {
        results.push(this.createToolNotFoundResult(selection.toolName));
        continue;
      }

      const params: ToolParams = {
        context,
        intent,
        conversationHistory,
        ...selection.parameters,
      };

      const result = await this.executeToolWithTimeout(
        tool,
        params,
        tool.definition.timeoutMs || 10000,
      );
      results.push(result);

      // Stop if critical error
      if (!result.success && result.error?.includes('CRITICAL')) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a tool with timeout
   */
  private async executeToolWithTimeout(
    tool: BaseTool,
    params: ToolParams,
    timeoutMs: number,
  ): Promise<ToolResult> {
    const timeoutPromise = new Promise<ToolResult>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs),
    );

    try {
      return await Promise.race([tool.execute(params), timeoutPromise]);
    } catch (error) {
      return {
        success: false,
        content: '',
        citations: [],
        metadata: {
          toolName: tool.definition.name,
          executionTimeMs: timeoutMs,
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Create result for tool not found
   */
  private createToolNotFoundResult(toolName: string): ToolResult {
    return {
      success: false,
      content: '',
      citations: [],
      metadata: {
        toolName,
        executionTimeMs: 0,
        confidence: 0,
        error: `Tool '${toolName}' not found`,
      },
    };
  }

  /**
   * Calculate combined confidence from multiple tool results
   */
  private calculateCombinedConfidence(results: ToolResult[]): number {
    if (results.length === 0) return 0;

    const successfulResults = results.filter((r) => r.success);
    if (successfulResults.length === 0) return 0;

    // Extract confidence from metadata
    const confidences = successfulResults
      .map((r) => r.metadata?.confidence as number | undefined)
      .filter((c): c is number => typeof c === 'number');

    if (confidences.length === 0) return 0.5; // Default

    // Weighted average based on success
    const totalConfidence = confidences.reduce((sum, c) => sum + c, 0);
    return totalConfidence / confidences.length;
  }
}
