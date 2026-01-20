/**
 * Conversation Service
 *
 * Orchestrates the complete conversation flow including intent classification,
 * tool routing, response generation, and safety checks.
 *
 * @module @schoolos/api/chat
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import {
  IntentClassifier,
  ToolRouter,
  ToolRegistry,
  ResponseGenerator,
  SafetyGuardrails,
  KnowledgeRetrievalTool,
  CalendarQueryTool,
  StudentDataFetchTool,
  EscalationTool,
} from '@schoolos/ai';
import { HybridSearchService } from '../knowledge/search/hybrid-search.service';
import { $Enums } from '@prisma/client';

// ============================================================
// LOCAL TYPE DEFINITIONS
// (Matches @schoolos/ai types - workaround for stub .d.ts files)
// ============================================================

/** User context for AI operations */
interface LocalUserContext {
  userId: string;
  districtId: string;
  role: string;
  email?: string;
  name?: string;
  displayName?: string;
  schoolIds?: string[];
  childrenIds?: string[];
  permissions?: string[];
}

/** Conversation message for context */
interface LocalConversationMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Full conversation context */
interface LocalConversationContext {
  conversationId?: string;
  conversationHistory: LocalConversationMessage[];
  activeChildId?: string;
  conversationSummary?: string;
  topics?: string[];
  user: LocalUserContext;
  districtConfig?: Record<string, unknown>;
  // Additional fields expected by tool-router/response-generator
  recentTopics?: string[];
  pendingQuestion?: string;
  messageCount?: number;
  lastInteractionTime?: Date;
}

/** Classified intent result */
interface LocalClassifiedIntent {
  category: string;
  secondaryCategory?: string;
  confidence: number;
  urgency?: 'low' | 'medium' | 'high';
  entities?: Record<string, unknown>;
  requiresTools?: boolean;
  requiresStudentContext?: boolean;
  shouldEscalate?: boolean;
  reasoning?: string;
  originalQuery?: string;
  classifiedAt?: Date;
}

/** Safety check result */
interface LocalSafetyCheckResult {
  passed: boolean;
  violations?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  sanitizedContent?: string;
}

/** Tool execution result */
interface LocalToolResult {
  toolName: string;
  success: boolean;
  content?: string;
  data?: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
}

/** Generated response */
interface LocalGeneratedResponse {
  content: string;
  citations?: Array<{
    sourceId: string;
    sourceTitle?: string;
    title?: string;
    quote?: string;
    excerpt?: string;
  }>;
}

/** Intent categories */
const LocalIntentCategory = {
  GREETING: 'greeting',
  OUT_OF_SCOPE: 'out_of_scope',
  SCHEDULE: 'schedule',
  GRADES: 'grades',
  ATTENDANCE: 'attendance',
  POLICY: 'policy',
  GENERAL: 'general',
} as const;

// Re-export as the original names for use in the service
type UserContext = LocalUserContext;
type ConversationMessage = LocalConversationMessage;
type ConversationContext = LocalConversationContext;
type ClassifiedIntent = LocalClassifiedIntent;
type SafetyCheckResult = LocalSafetyCheckResult;
type ToolResult = LocalToolResult;
type GeneratedResponse = LocalGeneratedResponse;
const IntentCategory = LocalIntentCategory;

// ============================================================
// TYPES
// ============================================================

export interface SendMessageInput {
  /** Conversation ID (null for new conversation) */
  conversationId?: string;

  /** User message content */
  message: string;

  /** User context */
  userContext: UserContext;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Citation in the API response */
interface ResponseCitation {
  sourceId: string;
  title: string;
  excerpt?: string;
}

/** Intent information in the API response */
interface ResponseIntent {
  category: string;
  confidence: number;
  urgency: string;
  requiresTools: boolean;
}

/** Message information in the API response */
interface ResponseMessage {
  id: string;
  content: string;
  role: string;
}

/** Tool result in the API response */
interface ResponseToolResult {
  success: boolean;
  content: string;
  citations: ResponseCitation[];
}

/** Generated response in the API response */
interface ResponseContent {
  content: string;
  citations: ResponseCitation[];
}

export interface ConversationServiceResponse {
  /** Conversation ID */
  conversationId: string;

  /** Conversation title */
  conversationTitle: string;

  /** User message information */
  message: ResponseMessage;

  /** Intent classification result */
  intent: ResponseIntent;

  /** Tool execution result */
  toolResult: ResponseToolResult;

  /** Generated response */
  response: ResponseContent;
}

// ============================================================
// MOCK SERVICE IMPLEMENTATIONS (for tools)
// ============================================================

class MockCalendarService {
  async getEvents(_params: {
    districtId: string;
    startDate: Date;
    endDate: Date;
    eventTypes?: string[];
    schoolIds?: string[];
  }) {
    // In production, this would query the actual calendar
    return [];
  }
}

class MockStudentDataService {
  async getStudentInfo(_studentId: string, _districtId: string) {
    return null;
  }
  async getStudentGrades(_studentId: string, _districtId: string) {
    return [];
  }
  async getStudentAttendance(_studentId: string, _districtId: string) {
    return { totalDays: 0, present: 0, absent: 0, tardy: 0, excused: 0, recentAbsences: [] };
  }
  async getStudentAssignments(_studentId: string, _districtId: string) {
    return [];
  }
}

class MockEscalationService {
  async createEscalation(_request: any) {
    return {
      ticketId: `ESC-${Date.now()}`,
      estimatedWaitTime: 300,
    };
  }
  async getAvailableAgents() {
    return 2;
  }
  async notifyUrgent() {
    // Send notification
  }
}

// ============================================================
// STUB IMPLEMENTATIONS (for no API key)
// ============================================================

class StubIntentClassifier {
  async classify(
    _message: string,
    _context: ConversationContext,
  ): Promise<ClassifiedIntent> {
    return {
      category: 'general',
      confidence: 0.5,
      urgency: 'low',
      entities: {},
      requiresTools: false,
      shouldEscalate: false,
    };
  }
}

class StubToolRouter {
  async route(
    _intent: ClassifiedIntent,
    _userContext: UserContext,
    _conversationContext: ConversationContext,
  ) {
    return {
      selectedTools: [],
      reasoning: 'AI limited mode - no tools available',
      priority: 'low' as const,
    };
  }

  async execute(
    _selectedTools: any[],
    _userContext: UserContext,
    _conversationContext: ConversationContext,
  ) {
    return {
      toolResults: [] as ToolResult[],
      requiresFollowUp: false,
    };
  }
}

class StubResponseGenerator {
  async generate(
    _intent: ClassifiedIntent,
    _toolResults: ToolResult[],
    _userContext: UserContext,
    _conversationContext: ConversationContext,
  ): Promise<GeneratedResponse> {
    return {
      content: '⚠️ AI Limited Mode: The AI service is currently in limited mode. Full AI capabilities require API configuration. Your message has been received, but automated intelligent responses are unavailable at this time.',
      confidence: 0.5,
      citations: [],
      suggestedFollowUps: ['Contact an administrator for assistance'],
    } as GeneratedResponse;
  }
}

class StubSafetyGuardrails {
  async checkInput(_message: string, _userContext: UserContext): Promise<SafetyCheckResult> {
    return {
      passed: true,
      violations: [],
      sanitizedContent: '',
    };
  }

  async checkOutput(_content: string, _userContext: UserContext): Promise<SafetyCheckResult> {
    return {
      passed: true,
      violations: [],
      sanitizedContent: '',
    };
  }
}

// ============================================================
// CONVERSATION SERVICE
// ============================================================

@Injectable()
export class ConversationService implements OnModuleInit {
  private readonly logger = new Logger(ConversationService.name);

  private intentClassifier!: IntentClassifier;
  private toolRouter!: ToolRouter;
  private responseGenerator!: ResponseGenerator;
  private safetyGuardrails!: SafetyGuardrails;
  private toolRegistry!: ToolRegistry;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly hybridSearchService: HybridSearchService,
  ) {}

  async onModuleInit() {
    await this.initializeComponents();
  }

  /**
   * Initialize all AI components
   */
  private async initializeComponents() {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - using stub AI implementations');
      this.initializeStubComponents();
      return;
    }

    // Initialize Intent Classifier
    this.intentClassifier = new IntentClassifier({
      apiKey: openaiApiKey,
      model: 'gpt-4.1-mini',
    });

    // Initialize Tool Registry and Tools
    this.toolRegistry = new ToolRegistry();

    // Register Knowledge Retrieval Tool
    this.toolRegistry.register(new KnowledgeRetrievalTool(this.hybridSearchService));

    // Register Calendar Tool
    this.toolRegistry.register(new CalendarQueryTool(new MockCalendarService()));

    // Register Student Data Tool
    this.toolRegistry.register(new StudentDataFetchTool(new MockStudentDataService()));

    // Register Escalation Tool
    this.toolRegistry.register(new EscalationTool(new MockEscalationService()));

    // Initialize Tool Router
    this.toolRouter = new ToolRouter(this.toolRegistry, {
      openaiApiKey,
      enableParallelExecution: true,
    });

    // Initialize Response Generator
    this.responseGenerator = new ResponseGenerator({
      openaiApiKey,
      includeSuggestedFollowUps: true,
    });

    // Initialize Safety Guardrails
    this.safetyGuardrails = new SafetyGuardrails({
      enablePiiDetection: true,
      enableContentFilter: true,
      enableFerpaCompliance: true,
    });

    this.logger.log('AI components initialized successfully');
  }

  /**
   * Initialize stub components when no API key is available
   */
  private initializeStubComponents() {
    this.intentClassifier = new StubIntentClassifier() as any;
    this.toolRouter = new StubToolRouter() as any;
    this.responseGenerator = new StubResponseGenerator() as any;
    this.safetyGuardrails = new StubSafetyGuardrails() as any;
    
    this.logger.log('Stub AI components initialized - limited mode active');
  }

  /**
   * Process a user message and generate a response
   */
  async sendMessage(input: SendMessageInput): Promise<ConversationServiceResponse> {
    const { conversationId, message, userContext, metadata } = input;

    // 1. Safety check on input
    const inputSafetyCheck = await this.safetyGuardrails.checkInput(message, userContext);
    if (!inputSafetyCheck.passed) {
      this.logger.warn('Input failed safety check', { violations: inputSafetyCheck.violations });

      // For severe violations, reject the message
      if (
        inputSafetyCheck.violations?.some(
          (v: any) => v.severity === 'HIGH',
        )
      ) {
        return this.createSafetyErrorResponse(conversationId || '', inputSafetyCheck as any);
      }
    }

    // 2. Get or create conversation
    const conversation = await this.getOrCreateConversation(conversationId, userContext);

    // 3. Save user message
    const userMessage = await this.saveMessage(conversation.id, 'user', message, metadata);

    // 4. Load conversation history
    const conversationHistory = await this.loadConversationHistory(conversation.id);

    // 5. Build conversation context for intent classification
    const fullConversationContext: ConversationContext = {
      conversationHistory,
      user: userContext,
      // Include any topics from the mini context
      topics: this.buildConversationContext(conversationHistory).recentTopics,
    };

    // 6. Classify intent
    const intent = await this.intentClassifier.classify(
      message,
      fullConversationContext as any,
    );

    this.logger.debug('Intent classified', {
      category: intent.category,
      confidence: intent.confidence,
      urgency: intent['urgency'],
    });

    // 6b. Update user message with intent metadata
    await this.prisma.message.update({
      where: { id: userMessage.id },
      data: {
        metadata: {
          ...(metadata || {}),
          intent: intent.category,
          confidence: intent.confidence,
          urgency: (intent as any).urgency || 'low',
          requiresTools: (intent as any).requiresTools || false,
        } as any,
      },
    });

    // 7. Handle special cases (greetings, simple queries)
    if (this.isSimpleIntent(intent as any)) {
      const simpleResponse = await this.handleSimpleIntent(intent as any, userContext, fullConversationContext);
      await this.saveMessage(conversation.id, 'assistant', simpleResponse.response, {
        intent: intent.category,
        confidence: intent.confidence,
      });

      // Return canonical response format
      return {
        conversationId: conversation.id,
        conversationTitle: conversation.title || 'New Conversation',
        message: {
          id: userMessage.id,
          content: message,
          role: 'USER',
        },
        intent: {
          category: intent.category,
          confidence: intent.confidence,
          urgency: (intent as any).urgency || 'low',
          requiresTools: (intent as any).requiresTools || false,
        },
        toolResult: {
          success: true,
          content: 'No tools were executed for this request.',
          citations: [],
        },
        response: {
          content: simpleResponse.response,
          citations: [],
        },
      };
    }

    // 8. Route to appropriate tools
    const routing = await this.toolRouter.route(intent as any, userContext as any, fullConversationContext as any);

    this.logger.debug('Routing determined', {
      tools: routing.selectedTools.map((t: { toolName: string }) => t.toolName),
      requiresEscalation: routing.requiresEscalation,
    });

    // 9. Execute tools
    const executionResult = await this.toolRouter.execute(
      routing,
      intent as any,
      userContext as any,
      conversationHistory as any,
    );

    // 10. Generate response
    const generatedResponse = await this.responseGenerator.generate({
      intent: intent as any,
      executionResult,
      userContext: userContext as any,
      conversationContext: fullConversationContext as any,
      conversationHistory: conversationHistory as any,
    });

    // 11. Safety check on output
    const outputSafetyCheck = await this.safetyGuardrails.checkOutput(
      generatedResponse as any,
      userContext as any,
      intent as any,
    );

    const finalContent = outputSafetyCheck.passed
      ? generatedResponse.content
      : outputSafetyCheck.sanitizedContent || generatedResponse.content;

    // 12. Save assistant message
    await this.saveMessage(conversation.id, 'assistant', finalContent, {
      intent: intent.category,
      confidence: intent.confidence,
      toolsUsed: executionResult.toolResults.map((r: any) => r.metadata?.toolName || 'unknown'),
      citations: generatedResponse.citations,
      safetyFiltered: !outputSafetyCheck.passed,
    });

    // 13. Update conversation metadata
    await this.updateConversationMetadata(conversation.id, {
      lastIntentCategory: intent.category,
      lastToolsUsed: executionResult.toolResults.map((r: any) => r.metadata?.toolName || 'unknown'),
      messageCount: conversationHistory.length + 2,
      requiresFollowUp: executionResult.requiresFollowUp,
    });

    // Transform citations to canonical format
    const citations = (generatedResponse.citations || []).map((c: any) => ({
      sourceId: c.sourceId || c.id || 'unknown',
      title: c.sourceTitle || c.title || 'Unknown Source',
      excerpt: c.quote || c.excerpt || undefined,
    }));

    // Return canonical response format
    return {
      conversationId: conversation.id,
      conversationTitle: conversation.title || 'New Conversation',
      message: {
        id: userMessage.id,
        content: message,
        role: 'USER',
      },
      intent: {
        category: intent.category,
        confidence: intent.confidence,
        urgency: (intent as any).urgency || 'low',
        requiresTools: (intent as any).requiresTools || false,
      },
      toolResult: {
        success: true,
        content: executionResult.toolResults.length > 0 
          ? executionResult.toolResults.map((r: any) => r.content || '').join('\n')
          : 'No tools were executed for this request.',
        citations: citations,
      },
      response: {
        content: finalContent,
        citations: citations,
      },
    };
  }

  /**
   * Get conversation history
   */
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<{
    id: string;
    title?: string;
    status?: string;
    messages: ConversationMessage[];
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return null;
    }

    return {
      id: conversation.id,
      ...(conversation.title ? { title: conversation.title } : {}),
      status: String(conversation.status || 'ACTIVE'),
      messages: conversation.messages.map(
        (m): ConversationMessage => ({
          id: m.id,
          role: (typeof m.role === 'string' ? m.role.toLowerCase() : m.role) as
            | 'user'
            | 'assistant'
            | 'system',
          content: m.content,
          timestamp: m.createdAt,
          ...(m && (m as any).metadata
            ? { metadata: (m as any).metadata as Record<string, unknown> }
            : {}),
        }),
      ),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * List user's conversations
   */
  async listConversations(
    userId: string,
    districtId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    conversations: Array<{
      id: string;
      title?: string;
      lastMessage?: string;
      messageCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
  }> {
    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          userId,
          districtId,
        },
        orderBy: { updatedAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.conversation.count({
        where: { userId, districtId },
      }),
    ]);

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        ...(c.title ? { title: c.title } : {}),
        ...(c.messages[0]?.content
          ? { lastMessage: c.messages[0]?.content.substring(0, 100) }
          : {}),
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return false;
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return true;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async getOrCreateConversation(
    conversationId: string | undefined,
    userContext: UserContext,
  ) {
    if (conversationId && conversationId.trim().length > 0) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: userContext.userId,
          districtId: userContext.districtId,
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        userId: userContext.userId,
        districtId: userContext.districtId,
        metadata: {
          userRole: userContext.role,
          primarySchoolId: userContext.schoolIds?.[0],
        },
      },
    });
  }

  private async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const prismaRole = role.toUpperCase() as $Enums.MessageRole;

    return this.prisma.message.create({
      data: {
        conversationId,
        role: prismaRole,
        content,
        metadata: (metadata || {}) as any,
      },
    });
  }

  private async loadConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit history for context window
    });

    return messages.map((m): ConversationMessage => ({
      id: m.id,
      role: (typeof m.role === 'string' ? m.role.toLowerCase() : m.role) as
        | 'user'
        | 'assistant'
        | 'system',
      content: m.content,
      timestamp: m.createdAt,
      ...(m && (m as any).metadata
        ? { metadata: (m as any).metadata as Record<string, unknown> }
        : {}),
    }));
  }

  private buildConversationContext(messages: ConversationMessage[]): {
    recentTopics: string[];
    pendingQuestion: boolean;
    messageCount: number;
    lastInteractionTime: Date;
  } {
    // Extract recent topics from message content
    const recentTopics: string[] = [];
    const lastFewMessages = messages.slice(-5);

    for (const msg of lastFewMessages) {
      const metadata = (msg as any).metadata as Record<string, unknown> | undefined;
      if (metadata?.['intent']) {
        recentTopics.push(metadata['intent'] as string);
      }
    }

    // Check for pending questions
    const pendingQuestion = lastFewMessages
      .filter((m) => m.role === 'assistant')
      .some((m) => m.content.includes('?'));

    return {
      recentTopics: [...new Set(recentTopics)],
      pendingQuestion,
      messageCount: messages.length,
      lastInteractionTime: messages[messages.length - 1]?.timestamp || new Date(),
    };
  }

  private isSimpleIntent(intent: ClassifiedIntent): boolean {
    const simpleCategories: string[] = ['GREETING', 'OUT_OF_SCOPE'];
    return simpleCategories.includes(intent.category as string) && intent.confidence > 0.8;
  }

  private async handleSimpleIntent(
    intent: ClassifiedIntent,
    userContext: UserContext,
    _conversationContext?: ConversationContext,
  ): Promise<{ response: string }> {
    if (intent.category === IntentCategory.GREETING) {
      const greeting = this.getGreetingResponse(userContext);
      return { response: greeting };
    }

    // Out of scope
    return {
      response:
        "I'm here to help with school-related questions like schedules, grades, attendance, and policies. " +
        'Is there something specific about school I can help you with?',
    };
  }

  private getGreetingResponse(userContext: UserContext): string {
    const roleGreetings: Record<string, string> = {
      PARENT: "Hello! I'm your school assistant. I can help you with your child's grades, attendance, school events, and policies. How can I assist you today?",
      STUDENT: "Hi there! I'm your school assistant. I can help you with your schedule, assignments, grades, and school information. What would you like to know?",
      TEACHER: "Hello! I'm the school assistant. I can help you find information about policies, schedules, and student data. How can I help?",
      ADMIN: "Hello! I'm the school assistant. I can help you access district information, policies, and data. What do you need?",
      STAFF: "Hello! I'm the school assistant. How can I help you today?",
    };

    return (roleGreetings[userContext.role] ?? roleGreetings['STAFF']) ?? 'Hello!';
  }

  private createSafetyErrorResponse(
    conversationId: string,
    _safetyCheck: SafetyCheckResult,
  ): ConversationServiceResponse {
    const errorMessage = 
      "I'm not able to process that request. Please rephrase your question, " +
      'or contact the school office if you need immediate assistance.';
    
    return {
      conversationId,
      conversationTitle: 'Safety Alert',
      message: {
        id: '',
        content: '',
        role: 'USER',
      },
      intent: {
        category: 'SAFETY_BLOCKED',
        confidence: 0,
        urgency: 'high',
        requiresTools: false,
      },
      toolResult: {
        success: false,
        content: 'Message blocked by safety filter.',
        citations: [],
      },
      response: {
        content: errorMessage,
        citations: [],
      },
    };
  }

  private async updateConversationMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ) {
    const current = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...(current?.metadata as Record<string, unknown> || {}),
          ...metadata,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  }
}
