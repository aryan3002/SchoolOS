declare module '@schoolos/ai' {
  export type UserRole = 'PARENT' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'STAFF' | string;

  export interface UserContext {
    userId: string;
    districtId: string;
    role: UserRole;
    email?: string | undefined;
    displayName?: string | undefined;
    childIds?: string[] | undefined;
    schoolIds?: string[] | undefined;
    sectionIds?: string[] | undefined;
    permissions?: string[] | undefined;
    requestMetadata?: Record<string, unknown> | undefined;
  }

  export interface ConversationMessage {
    id?: string | undefined;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown> | undefined;
    toolsUsed?: string[] | undefined;
  }

  export interface ConversationContext {
    recentTopics: string[];
    pendingQuestion: boolean;
    messageCount: number;
    lastInteractionTime: Date;
  }

  export interface ClassifiedIntent {
    category: IntentCategory | string;
    confidence: number;
    urgencyLevel?: string | undefined;
    originalQuery?: string | undefined;
    [key: string]: unknown;
  }

  export interface ToolResult {
    success: boolean;
    toolName: string;
    content: string;
    data?: Record<string, unknown> | undefined;
    source?: Record<string, unknown> | undefined;
    confidence: number;
    citations?: Array<Record<string, unknown>> | undefined;
    error?: string | undefined;
    executionTimeMs?: number | undefined;
    requiresFollowUp?: boolean | undefined;
  }

  export interface GeneratedResponse {
    content: string;
    citations?: Array<Record<string, unknown>>;
    suggestedFollowUps: string[];
    confidence: number;
  }

  export type SafetyCheckResult = {
    passed: boolean;
    sanitizedContent?: string | undefined;
    violations: Array<{ severity?: string; description?: string; [key: string]: unknown }>;
  };

  export type IntentCategory = string;
  export const IntentCategory: {
    GREETING: 'GREETING';
    OUT_OF_SCOPE: 'OUT_OF_SCOPE';
    POLICY_QUESTION: 'POLICY_QUESTION';
    GENERAL_INFO: 'GENERAL_INFO';
    OPERATIONAL: 'OPERATIONAL';
    CALENDAR_QUERY: 'CALENDAR_QUERY';
    ADMINISTRATIVE: 'ADMINISTRATIVE';
  };

  export class IntentClassifier {
    constructor(config: Record<string, unknown>);
    classify(
      message: string,
      userContext: UserContext,
      conversationContext?: ConversationContext,
    ): Promise<ClassifiedIntent>;
  }

  export class ToolRegistry {
    register(tool: unknown): void;
    getTool?(name: string): unknown;
  }

  export class ToolRouter {
    constructor(registry: ToolRegistry, config?: Record<string, unknown>);
    route(
      intent: ClassifiedIntent,
      userContext: UserContext,
      conversationContext?: ConversationContext,
    ): Promise<{ selectedTools: Array<{ toolName: string; tool?: unknown; params?: Record<string, unknown> }>; requiresEscalation?: boolean }>;
    execute(
      routing: { selectedTools: Array<{ toolName: string; tool?: unknown; params?: Record<string, unknown> }> },
      intent: ClassifiedIntent,
      userContext: UserContext,
      history?: ConversationMessage[],
    ): Promise<{ toolResults: ToolResult[]; requiresFollowUp?: boolean }>;
  }

  export class ResponseGenerator {
    constructor(config: Record<string, unknown>);
    generate(input: Record<string, unknown>): Promise<GeneratedResponse>;
  }

  export class SafetyGuardrails {
    constructor(config?: Record<string, unknown>);
    checkInput(message: string, context?: UserContext): Promise<SafetyCheckResult>;
    checkOutput(
      response: GeneratedResponse,
      context: UserContext,
      intent?: ClassifiedIntent,
    ): Promise<SafetyCheckResult>;
  }

  export class KnowledgeRetrievalTool {
    constructor(searchService: unknown);
    toolName?: string;
    definition?: Record<string, unknown>;
  }

  export class CalendarQueryTool {
    constructor(calendarService: unknown);
    toolName?: string;
    definition?: Record<string, unknown>;
  }

  export class StudentDataFetchTool {
    constructor(studentService: unknown);
    toolName?: string;
    definition?: Record<string, unknown>;
  }

  export class EscalationTool {
    constructor(escalationService: unknown);
    toolName?: string;
    definition?: Record<string, unknown>;
  }

  export type ConversationResponse = Record<string, unknown>;
}
