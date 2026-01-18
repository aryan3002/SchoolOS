/**
 * Intent Classifier
 *
 * Production-grade intent classification using Claude for SchoolOS.
 * Analyzes user messages and classifies them into actionable intents
 * with extracted entities, confidence scores, and urgency levels.
 *
 * Features:
 * - Multi-category classification
 * - Entity extraction (students, dates, subjects, etc.)
 * - Confidence scoring
 * - Escalation detection
 * - Context-aware classification
 *
 * @module @schoolos/ai/intent
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import {
  IntentCategory,
  UrgencyLevel,
  ClassifiedIntent,
  ExtractedEntities,
  ConversationContext,
} from '../types';

// ============================================================
// CONFIGURATION
// ============================================================

export interface IntentClassifierConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Model to use for classification */
  model?: string;

  /** Max tokens for classification response */
  maxTokens?: number;

  /** Temperature for classification (lower = more deterministic) */
  temperature?: number;

  /** Confidence threshold for escalation */
  escalationThreshold?: number;

  /** Enable debug logging */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<Omit<IntentClassifierConfig, 'apiKey'>> = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1000,
  temperature: 0.1, // Low temperature for consistent classification
  escalationThreshold: 0.6,
  debug: false,
};

// ============================================================
// ZODE SCHEMAS FOR VALIDATION
// ============================================================

const ExtractedEntitiesSchema = z.object({
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  date: z.string().optional(),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  timeReference: z.string().optional(),
  subject: z.string().optional(),
  className: z.string().optional(),
  schoolName: z.string().optional(),
  schoolId: z.string().optional(),
  teacherName: z.string().optional(),
  teacherId: z.string().optional(),
  eventType: z.string().optional(),
  gradeLevel: z.string().optional(),
  documentType: z.string().optional(),
  custom: z.record(z.string()).optional(),
});

const ClassificationResponseSchema = z.object({
  intent: z.nativeEnum(IntentCategory),
  secondaryIntent: z.nativeEnum(IntentCategory).optional(),
  confidence: z.number().min(0).max(1),
  entities: ExtractedEntitiesSchema,
  requiresStudentContext: z.boolean(),
  urgency: z.nativeEnum(UrgencyLevel),
  shouldEscalate: z.boolean(),
  reasoning: z.string(),
});

type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;

// ============================================================
// INTENT CLASSIFIER CLASS
// ============================================================

export class IntentClassifier {
  private readonly client: Anthropic;
  private readonly config: Required<Omit<IntentClassifierConfig, 'apiKey'>> & { apiKey: string };

  constructor(config: IntentClassifierConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  /**
   * Classify a user message into an intent category
   *
   * @param message - The user's message to classify
   * @param context - Conversation and user context
   * @returns Classified intent with entities and metadata
   */
  async classify(message: string, context: ConversationContext): Promise<ClassifiedIntent> {
    const startTime = Date.now();

    try {
      // Build the classification prompt
      const prompt = this.buildClassificationPrompt(message, context);

      // Call Claude for classification
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in classification response');
      }

      // Parse and validate the response
      const classification = this.parseClassificationResponse(textContent.text);

      // Apply escalation rules
      const shouldEscalate = this.shouldEscalate(classification, context);

      const result: ClassifiedIntent = {
        ...classification,
        shouldEscalate,
        originalQuery: message,
        classifiedAt: new Date(),
      };

      if (this.config.debug) {
        console.log('[IntentClassifier] Classification result:', {
          intent: result.intent,
          confidence: result.confidence,
          urgency: result.urgency,
          shouldEscalate: result.shouldEscalate,
          durationMs: Date.now() - startTime,
        });
      }

      return result;
    } catch (error) {
      // On error, return a safe default classification
      console.error('[IntentClassifier] Classification error:', error);

      return {
        intent: IntentCategory.UNKNOWN,
        confidence: 0,
        entities: {},
        requiresStudentContext: false,
        urgency: UrgencyLevel.LOW,
        shouldEscalate: true, // Escalate on error
        reasoning: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalQuery: message,
        classifiedAt: new Date(),
      };
    }
  }

  /**
   * Build the classification prompt
   */
  private buildClassificationPrompt(message: string, context: ConversationContext): string {
    const roleDescription = this.getRoleDescription(context.user.role);
    const historyContext = this.buildHistoryContext(context.conversationHistory);

    return `You are an intent classifier for SchoolOS, an AI assistant for K-12 school districts.

USER CONTEXT:
- Role: ${context.user.role} (${roleDescription})
- District: ${context.districtConfig?.name || 'Unknown District'}
${context.activeChildId ? `- Currently discussing child ID: ${context.activeChildId}` : ''}
${context.user.childIds?.length ? `- Has ${context.user.childIds.length} children enrolled` : ''}

${historyContext ? `RECENT CONVERSATION:\n${historyContext}\n` : ''}

USER MESSAGE: "${message}"

Classify this message into ONE of these intent categories:
${Object.values(IntentCategory)
  .map((cat) => `- ${cat}: ${this.getIntentDescription(cat)}`)
  .join('\n')}

INSTRUCTIONS:
1. Choose the MOST specific intent that matches
2. Extract ALL relevant entities from the message
3. Consider the user's role when determining requiresStudentContext
4. Set urgency based on time-sensitivity and importance
5. Set shouldEscalate to true if:
   - This is an emergency
   - The intent is unclear (confidence < 0.6)
   - The message contains concerning content
   - The user is frustrated or needs human support
6. Provide clear reasoning for your classification

Respond with ONLY valid JSON in this exact format:
{
  "intent": "category_name",
  "secondaryIntent": "optional_secondary_category",
  "confidence": 0.95,
  "entities": {
    "studentName": "extracted name if mentioned",
    "date": "extracted date if mentioned",
    "subject": "extracted subject if mentioned",
    "eventType": "type of event if mentioned",
    "timeReference": "tomorrow, next week, etc.",
    "custom": { "key": "value" }
  },
  "requiresStudentContext": true,
  "urgency": "low|medium|high|critical",
  "shouldEscalate": false,
  "reasoning": "Brief explanation of why this classification was chosen"
}`;
  }

  /**
   * Get description for a user role
   */
  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      PARENT: 'Parent/guardian of enrolled students',
      TEACHER: 'Teacher at the school',
      STUDENT: 'Student enrolled in the school',
      ADMIN: 'School or district administrator',
      STAFF: 'School staff member',
    };
    return descriptions[role] || 'Unknown role';
  }

  /**
   * Get description for an intent category
   */
  private getIntentDescription(intent: IntentCategory): string {
    const descriptions: Record<IntentCategory, string> = {
      [IntentCategory.CALENDAR_QUERY]: 'Questions about dates, events, schedules, holidays',
      [IntentCategory.POLICY_QUESTION]: 'Questions about school policies, rules, procedures',
      [IntentCategory.STUDENT_SPECIFIC]:
        'Questions about a specific student (grades, progress, attendance)',
      [IntentCategory.ASSIGNMENT_HELP]: 'Help with homework or assignments',
      [IntentCategory.GENERAL_INFO]: 'General school information, contacts, hours',
      [IntentCategory.OPERATIONAL]: 'Lunch menus, transportation, facilities, supplies',
      [IntentCategory.COMPLAINT]: 'Complaints, concerns, or issues that need attention',
      [IntentCategory.EMERGENCY]: 'Urgent safety or emergency situations',
      [IntentCategory.ADMINISTRATIVE]: 'Registration, enrollment, forms, processes',
      [IntentCategory.COMMUNICATION]: 'Sending messages to teachers or staff',
      [IntentCategory.TECHNICAL_SUPPORT]: 'Technical issues with school systems',
      [IntentCategory.UNKNOWN]: 'Cannot determine intent clearly',
    };
    return descriptions[intent];
  }

  /**
   * Build context from conversation history
   */
  private buildHistoryContext(history: ConversationContext['conversationHistory']): string {
    if (!history || history.length === 0) return '';

    // Only use last 3 messages for context
    const recentHistory = history.slice(-3);

    return recentHistory
      .map((msg) => {
        const role = msg.role === 'USER' ? 'User' : 'Assistant';
        const content =
          msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
        return `${role}: ${content}`;
      })
      .join('\n');
  }

  /**
   * Parse and validate the classification response
   */
  private parseClassificationResponse(responseText: string): ClassificationResponse {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in classification response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ClassificationResponseSchema.parse(parsed);

    return validated;
  }

  /**
   * Determine if escalation is needed based on classification and context
   */
  private shouldEscalate(
    classification: ClassificationResponse,
    context: ConversationContext,
  ): boolean {
    // Always escalate emergencies
    if (classification.intent === IntentCategory.EMERGENCY) {
      return true;
    }

    // Escalate if already flagged
    if (classification.shouldEscalate) {
      return true;
    }

    // Escalate low confidence
    if (classification.confidence < this.config.escalationThreshold) {
      return true;
    }

    // Escalate complaints with high urgency
    if (
      classification.intent === IntentCategory.COMPLAINT &&
      (classification.urgency === UrgencyLevel.HIGH ||
        classification.urgency === UrgencyLevel.CRITICAL)
    ) {
      return true;
    }

    // Escalate student safety concerns
    if (this.containsSafetyConcerns(classification)) {
      return true;
    }

    return false;
  }

  /**
   * Check for student safety concerns in the classification
   */
  private containsSafetyConcerns(classification: ClassificationResponse): boolean {
    const safetyConcernPatterns = [
      /bully/i,
      /harm/i,
      /threat/i,
      /abuse/i,
      /suicide/i,
      /danger/i,
      /hurt/i,
      /scared/i,
      /afraid/i,
      /weapon/i,
    ];

    return safetyConcernPatterns.some(
      (pattern) =>
        pattern.test(classification.reasoning) ||
        pattern.test(JSON.stringify(classification.entities)),
    );
  }

  /**
   * Batch classify multiple messages (for analytics)
   */
  async batchClassify(
    messages: Array<{ message: string; context: ConversationContext }>,
  ): Promise<ClassifiedIntent[]> {
    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: ClassifiedIntent[] = [];

    for (let i = 0; i < messages.length; i += concurrencyLimit) {
      const batch = messages.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(({ message, context }) => this.classify(message, context)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get intent categories that should trigger specific tools
   */
  static getToolMapping(): Record<IntentCategory, string[]> {
    return {
      [IntentCategory.CALENDAR_QUERY]: ['calendar_query', 'knowledge_retrieval'],
      [IntentCategory.POLICY_QUESTION]: ['knowledge_retrieval'],
      [IntentCategory.STUDENT_SPECIFIC]: ['student_data_fetch', 'knowledge_retrieval'],
      [IntentCategory.ASSIGNMENT_HELP]: ['knowledge_retrieval', 'student_data_fetch'],
      [IntentCategory.GENERAL_INFO]: ['knowledge_retrieval'],
      [IntentCategory.OPERATIONAL]: ['knowledge_retrieval', 'calendar_query'],
      [IntentCategory.COMPLAINT]: ['escalation', 'knowledge_retrieval'],
      [IntentCategory.EMERGENCY]: ['escalation'],
      [IntentCategory.ADMINISTRATIVE]: ['knowledge_retrieval', 'sis_query'],
      [IntentCategory.COMMUNICATION]: ['message_draft', 'contact_lookup'],
      [IntentCategory.TECHNICAL_SUPPORT]: ['escalation'],
      [IntentCategory.UNKNOWN]: ['escalation'],
    };
  }
}
