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
import { PrismaService } from '../prisma/prisma.service';
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
  ClassifiedIntent,
  UserContext,
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  IntentCategory,
  UrgencyLevel,
  EscalationReason,
} from '@schoolos/ai';
import { HybridSearchService } from '../knowledge/hybrid-search.service';

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

export interface ConversationServiceResponse {
  /** Conversation ID */
  conversationId: string;

  /** Message ID */
  messageId: string;

  /** Assistant response content */
  response: string;

  /** Citations if any */
  citations: Array<{
    sourceId: string;
    sourceTitle: string;
    quote?: string;
  }>;

  /** Suggested follow-up questions */
  suggestedFollowUps: string[];

  /** Whether human follow-up is pending */
  requiresFollowUp: boolean;

  /** Processing metadata */
  metadata: {
    intentCategory: string;
    confidence: number;
    toolsUsed: string[];
    processingTimeMs: number;
  };
}

// ============================================================
// MOCK SERVICE IMPLEMENTATIONS (for tools)
// ============================================================

class MockCalendarService {
  async getEvents(params: {
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
  async getStudentInfo(studentId: string, districtId: string) {
    return null;
  }
  async getStudentGrades(studentId: string, districtId: string) {
    return [];
  }
  async getStudentAttendance(studentId: string, districtId: string) {
    return { totalDays: 0, present: 0, absent: 0, tardy: 0, excused: 0, recentAbsences: [] };
  }
  async getStudentAssignments(studentId: string, districtId: string) {
    return [];
  }
}

class MockEscalationService {
  async createEscalation(request: any) {
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
    const anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - AI features will be limited');
      return;
    }

    // Initialize Intent Classifier
    this.intentClassifier = new IntentClassifier({
      anthropicApiKey,
      model: 'claude-sonnet-4-20250514',
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
      anthropicApiKey,
      enableParallelExecution: true,
    });

    // Initialize Response Generator
    this.responseGenerator = new ResponseGenerator({
      anthropicApiKey,
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
   * Process a user message and generate a response
   */
  async sendMessage(input: SendMessageInput): Promise<ConversationServiceResponse> {
    const startTime = Date.now();
    const { conversationId, message, userContext, metadata } = input;

    // 1. Safety check on input
    const inputSafetyCheck = await this.safetyGuardrails.checkInput(message, userContext);
    if (!inputSafetyCheck.passed) {
      this.logger.warn('Input failed safety check', { violations: inputSafetyCheck.violations });

      // For severe violations, reject the message
      if (inputSafetyCheck.violations.some((v) => v.severity === 'HIGH')) {
        return this.createSafetyErrorResponse(conversationId || '', inputSafetyCheck);
      }
    }

    // 2. Get or create conversation
    const conversation = await this.getOrCreateConversation(conversationId, userContext);

    // 3. Save user message
    const userMessage = await this.saveMessage(conversation.id, 'user', message, metadata);

    // 4. Load conversation history
    const conversationHistory = await this.loadConversationHistory(conversation.id);

    // 5. Build conversation context
    const conversationContext = this.buildConversationContext(conversationHistory);

    // 6. Classify intent
    const intent = await this.intentClassifier.classify(
      message,
      userContext,
      conversationContext,
    );

    this.logger.debug('Intent classified', {
      category: intent.category,
      confidence: intent.confidence,
      urgency: intent.urgencyLevel,
    });

    // 7. Handle special cases (greetings, simple queries)
    if (this.isSimpleIntent(intent)) {
      const simpleResponse = await this.handleSimpleIntent(intent, userContext, conversationContext);
      await this.saveMessage(conversation.id, 'assistant', simpleResponse.response, {
        intent: intent.category,
        confidence: intent.confidence,
      });

      return {
        conversationId: conversation.id,
        messageId: userMessage.id,
        ...simpleResponse,
        metadata: {
          intentCategory: intent.category,
          confidence: intent.confidence,
          toolsUsed: [],
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // 8. Route to appropriate tools
    const routing = await this.toolRouter.route(intent, userContext, conversationContext);

    this.logger.debug('Routing determined', {
      tools: routing.selectedTools.map((t) => t.toolName),
      requiresEscalation: routing.requiresEscalation,
    });

    // 9. Execute tools
    const executionResult = await this.toolRouter.execute(
      routing,
      intent,
      userContext,
      conversationHistory,
    );

    // 10. Generate response
    const generatedResponse = await this.responseGenerator.generate({
      intent,
      executionResult,
      userContext,
      conversationContext,
      conversationHistory,
    });

    // 11. Safety check on output
    const outputSafetyCheck = await this.safetyGuardrails.checkOutput(
      generatedResponse,
      userContext,
      intent,
    );

    const finalContent = outputSafetyCheck.passed
      ? generatedResponse.content
      : outputSafetyCheck.sanitizedContent || generatedResponse.content;

    // 12. Save assistant message
    await this.saveMessage(conversation.id, 'assistant', finalContent, {
      intent: intent.category,
      confidence: intent.confidence,
      toolsUsed: executionResult.toolResults.map((r) => r.toolName),
      citations: generatedResponse.citations,
      safetyFiltered: !outputSafetyCheck.passed,
    });

    // 13. Update conversation metadata
    await this.updateConversationMetadata(conversation.id, {
      lastIntentCategory: intent.category,
      lastToolsUsed: executionResult.toolResults.map((r) => r.toolName),
      messageCount: conversationHistory.length + 2,
      requiresFollowUp: executionResult.requiresFollowUp,
    });

    return {
      conversationId: conversation.id,
      messageId: userMessage.id,
      response: finalContent,
      citations: generatedResponse.citations,
      suggestedFollowUps: generatedResponse.suggestedFollowUps,
      requiresFollowUp: executionResult.requiresFollowUp,
      metadata: {
        intentCategory: intent.category,
        confidence: generatedResponse.confidence,
        toolsUsed: executionResult.toolResults.map((r) => r.toolName),
        processingTimeMs: Date.now() - startTime,
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
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: m.createdAt,
        metadata: m.metadata as Record<string, unknown> | undefined,
      })),
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
        title: c.title || undefined,
        lastMessage: c.messages[0]?.content.substring(0, 100),
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
    if (conversationId) {
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
          schoolId: userContext.schoolId,
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
    return this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata || {},
      },
    });
  }

  private async loadConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit history for context window
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.createdAt,
      metadata: m.metadata as Record<string, unknown> | undefined,
    }));
  }

  private buildConversationContext(messages: ConversationMessage[]): ConversationContext {
    // Extract recent topics from message content
    const recentTopics: string[] = [];
    const lastFewMessages = messages.slice(-5);

    for (const msg of lastFewMessages) {
      const metadata = msg.metadata as Record<string, unknown> | undefined;
      if (metadata?.intent) {
        recentTopics.push(metadata.intent as string);
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
    const simpleCategories = [IntentCategory.GREETING, IntentCategory.OUT_OF_SCOPE];
    return simpleCategories.includes(intent.category) && intent.confidence > 0.8;
  }

  private async handleSimpleIntent(
    intent: ClassifiedIntent,
    userContext: UserContext,
    conversationContext?: ConversationContext,
  ): Promise<Omit<ConversationServiceResponse, 'conversationId' | 'messageId' | 'metadata'>> {
    if (intent.category === IntentCategory.GREETING) {
      const greeting = this.getGreetingResponse(userContext);
      return {
        response: greeting,
        citations: [],
        suggestedFollowUps: [
          'What events are coming up this week?',
          'How is my child doing in school?',
          'What are the school policies on attendance?',
        ],
        requiresFollowUp: false,
      };
    }

    // Out of scope
    return {
      response:
        "I'm here to help with school-related questions like schedules, grades, attendance, and policies. " +
        'Is there something specific about school I can help you with?',
      citations: [],
      suggestedFollowUps: [
        'Tell me about upcoming school events',
        'What are the grading policies?',
        'How do I contact my child\'s teacher?',
      ],
      requiresFollowUp: false,
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

    return roleGreetings[userContext.role] || roleGreetings.STAFF;
  }

  private createSafetyErrorResponse(
    conversationId: string,
    safetyCheck: { violations: Array<{ description: string }> },
  ): ConversationServiceResponse {
    return {
      conversationId,
      messageId: '',
      response:
        "I'm not able to process that request. Please rephrase your question, " +
        'or contact the school office if you need immediate assistance.',
      citations: [],
      suggestedFollowUps: [],
      requiresFollowUp: false,
      metadata: {
        intentCategory: 'SAFETY_BLOCKED',
        confidence: 0,
        toolsUsed: [],
        processingTimeMs: 0,
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
