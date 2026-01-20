/**
 * Core Types for SchoolOS AI Orchestration
 *
 * These types define the fundamental building blocks for:
 * - Intent classification
 * - Tool execution
 * - Response generation
 * - Context management
 *
 * All types are designed for production-grade, type-safe AI orchestration.
 */

import { UserRole, ConversationStatus, MessageRole } from '@prisma/client';

// ============================================================
// INTENT CLASSIFICATION TYPES
// ============================================================

/**
 * Categories of user intents that SchoolOS can handle
 * Each category maps to specific tools and response strategies
 */
export enum IntentCategory {
  /** Questions about school calendar, events, schedules */
  CALENDAR_QUERY = 'calendar_query',

  /** Questions about school policies, rules, procedures */
  POLICY_QUESTION = 'policy_question',

  /** Questions specific to a particular student (grades, progress, etc.) */
  STUDENT_SPECIFIC = 'student_specific',

  /** Help with homework or assignments */
  ASSIGNMENT_HELP = 'assignment_help',

  /** General information about the school/district */
  GENERAL_INFO = 'general_info',

  /** Operational queries (lunch menu, transportation, facilities) */
  OPERATIONAL = 'operational',

  /** Complaints or concerns that may need human attention */
  COMPLAINT = 'complaint',

  /** Emergency situations requiring immediate escalation */
  EMERGENCY = 'emergency',

  /** Registration, enrollment, or administrative processes */
  ADMINISTRATIVE = 'administrative',

  /** Communication with teachers or staff */
  COMMUNICATION = 'communication',

  /** Technical support or system issues */
  TECHNICAL_SUPPORT = 'technical_support',

  /** Intent could not be determined confidently */
  UNKNOWN = 'unknown',
}

/**
 * Urgency levels for intent classification
 */
export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Entities extracted from user messages
 */
export interface ExtractedEntities {
  /** Student name or ID mentioned */
  studentId?: string;
  studentName?: string;

  /** Date or time references */
  date?: string;
  dateRange?: { start: string; end: string };
  timeReference?: string; // "tomorrow", "next week", etc.

  /** Subject or class mentioned */
  subject?: string;
  className?: string;

  /** School or location mentioned */
  schoolName?: string;
  schoolId?: string;

  /** Teacher or staff member mentioned */
  teacherName?: string;
  teacherId?: string;

  /** Event type */
  eventType?: string;

  /** Grade level */
  gradeLevel?: string;

  /** Document type being requested */
  documentType?: string;

  /** Any other extracted entities */
  custom?: Record<string, string>;
}

/**
 * Result of intent classification (CANONICAL INTERFACE)
 * 
 * This is the single source of truth for intent classification across the monorepo.
 * All components must use this exact shape.
 */
export interface ClassifiedIntent {
  /** Primary intent category (canonical field name) */
  category: IntentCategory;

  /** Secondary/fallback intent if applicable */
  secondaryCategory?: IntentCategory;

  /** Confidence score 0-1 (canonical) */
  confidence: number;

  /** Urgency level (canonical: 'low' | 'medium' | 'high') */
  urgency: 'low' | 'medium' | 'high';

  /** Extracted entities from the message (optional structured data) */
  entities?: ExtractedEntities;

  /** Whether this query requires tools to answer (canonical) */
  requiresTools: boolean;

  /** Whether this query requires student-specific context/permissions */
  requiresStudentContext?: boolean;

  /** Whether escalation to human is recommended */
  shouldEscalate?: boolean;

  /** Reasoning for the classification */
  reasoning?: string;

  /** Original query for reference */
  originalQuery?: string;

  /** Timestamp of classification */
  classifiedAt?: Date;
}

// ============================================================
// CONTEXT TYPES
// ============================================================

/**
 * User context for authorization and personalization
 */
export interface UserContext {
  /** User's unique ID */
  userId: string;

  /** User's district ID */
  districtId: string;

  /** User's role */
  role: UserRole;

  /** User's email */
  email: string;

  /** User's display name */
  displayName: string;

  /** IDs of children (for parents) */
  childIds?: string[];

  /** School IDs the user is associated with */
  schoolIds?: string[];

  /** Section IDs the user teaches (for teachers) */
  sectionIds?: string[];

  /** Custom permissions granted */
  permissions?: string[];

  /** Request-specific metadata */
  requestMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
}

/**
 * Conversation context for AI continuity
 */
export interface ConversationContext {
  /** Conversation ID */
  conversationId?: string;

  /** Previous messages for context (last N messages) */
  conversationHistory: ConversationMessage[];

  /** Current child being discussed (for parents) */
  activeChildId?: string;

  /** Summary of the conversation so far */
  conversationSummary?: string;

  /** Topics discussed in this conversation */
  topics?: string[];

  /** User context */
  user: UserContext;

  /** District-specific configuration */
  districtConfig?: DistrictConfig;
}

/**
 * Simplified conversation message for context
 */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
}

/**
 * District-specific configuration affecting AI behavior
 */
export interface DistrictConfig {
  /** District name */
  name: string;

  /** Timezone */
  timezone: string;

  /** Feature flags */
  features: Record<string, boolean>;

  /** Contact information */
  contacts?: {
    mainOffice?: string;
    supportEmail?: string;
    emergencyLine?: string;
  };

  /** Custom terminology */
  terminology?: Record<string, string>;

  /** Response tone/style preferences */
  responseStyle?: 'formal' | 'friendly' | 'neutral';
}

// ============================================================
// TOOL TYPES
// ============================================================

/**
 * Permission requirements for tools
 */
export enum Permission {
  /** Can read own student's data */
  READ_OWN_STUDENT = 'read:own_student',

  /** Can read all students (teachers, admins) */
  READ_ALL_STUDENTS = 'read:all_students',

  /** Can read knowledge base */
  READ_KNOWLEDGE = 'read:knowledge',

  /** Can query calendar */
  READ_CALENDAR = 'read:calendar',

  /** Can send messages */
  SEND_MESSAGES = 'send:messages',

  /** Can create support tickets */
  CREATE_TICKETS = 'create:tickets',

  /** Admin-level access */
  ADMIN = 'admin',
}

/**
 * Parameters for tool execution
 */
export interface ToolParams {
  /** The classified intent */
  intent: ClassifiedIntent;

  /** User context */
  context: UserContext;

  /** Additional tool-specific parameters */
  [key: string]: unknown;
}

/**
 * Result of a tool execution (CANONICAL INTERFACE)
 * 
 * This is the single source of truth for tool results across the monorepo.
 * All tools must return this exact shape.
 */
export interface ToolResult {
  /** Whether the tool executed successfully (canonical) */
  success: boolean;

  /** Retrieved/generated content (canonical) */
  content: string;

  /** Citations array with structured source information (canonical) */
  citations: Array<{
    sourceId: string;
    title: string;
    excerpt?: string;
  }>;

  /** Optional metadata for tool-specific data */
  metadata?: {
    /** Name of the tool that was executed */
    toolName?: string;

    /** Confidence in the result */
    confidence?: number;

    /** Source type */
    sourceType?: string;

    /** URL or reference */
    url?: string;

    /** Relevance score */
    relevanceScore?: number;

    /** Execution time in ms */
    executionTimeMs?: number;

    /** Structured data (tool-specific) */
    data?: Record<string, unknown>;

    /** Error message if success is false */
    error?: string;

    /** Any other tool-specific fields */
    [key: string]: unknown;
  };
}

/**
 * Citation from a source document
 */
export interface Citation {
  /** Chunk/source ID */
  sourceId: string;

  /** Chunk ID */
  chunkId?: string;

  /** Title of the source */
  title: string;

  /** The quoted text */
  quote: string;

  /** Page number if applicable */
  page?: number;

  /** Section header if applicable */
  section?: string;
}

/**
 * Tool selection made by the router
 */
export interface ToolSelection {
  /** Tool name */
  tool: string;

  /** Parameters for the tool */
  params: Record<string, unknown>;

  /** Priority (lower = execute first) */
  priority?: number;

  /** Whether this tool is required or optional */
  required?: boolean;
}

/**
 * Tool definition for registration
 */
export interface ToolDefinition {
  /** Unique tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Permissions required to use this tool */
  requiredPermissions: Permission[];

  /** Intent categories this tool handles */
  handlesIntents: IntentCategory[];

  /** Whether this tool requires student context */
  requiresStudentContext?: boolean;

  /** Timeout in milliseconds */
  timeoutMs?: number;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

/**
 * Generated response from the AI
 */
export interface GeneratedResponse {
  /** Response content */
  content: string;

  /** Confidence in the response */
  confidence: number;

  /** Citations used in the response (canonical citations array) */
  citations: Array<{
    sourceId: string;
    sourceTitle?: string;
    title?: string;
    quote?: string;
    excerpt?: string;
  }>;

  /** Suggested follow-up questions */
  suggestedFollowUps?: string[];

  /** Whether human follow-up is required */
  requiresFollowUp?: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete conversation response to the user
 */
export interface ConversationResponse {
  /** Conversation ID */
  conversationId: string;

  /** Message ID of the assistant's response */
  messageId: string;

  /** Response content */
  response: string;

  /** Sources used */
  sources: Array<{
    id: string;
    title: string;
    type: string;
    relevanceScore: number;
  }>;

  /** Citations in the response */
  citations: Citation[];

  /** Confidence score */
  confidence: number;

  /** Suggested follow-up questions */
  followUpSuggestions?: string[];

  /** Classification result for debugging/analytics */
  classification?: {
    intent: IntentCategory;
    confidence: number;
    entities: ExtractedEntities;
  };

  /** Performance metrics */
  timing?: {
    classificationMs: number;
    toolExecutionMs: number;
    generationMs: number;
    totalMs: number;
  };
}

// ============================================================
// SAFETY TYPES
// ============================================================

/**
 * Types of safety violations
 */
export enum SafetyViolationType {
  PII_EXPOSURE = 'pii_exposure',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  POLICY_VIOLATION = 'policy_violation',
  STUDENT_SAFETY_CONCERN = 'student_safety_concern',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  ACADEMIC_INTEGRITY = 'academic_integrity',
}

/**
 * Individual safety check result
 */
export interface SafetyCheck {
  /** Type of check */
  type: SafetyViolationType;

  /** Whether the check passed */
  passed: boolean;

  /** Severity if failed (1-10) */
  severity?: number;

  /** Details about the violation */
  details?: string;

  /** Recommended action */
  action?: 'allow' | 'redact' | 'block' | 'escalate';

  /** What to redact if action is 'redact' */
  redactionPattern?: string;
}

/**
 * Overall safety check result
 */
export interface SafetyCheckResult {
  /** Whether the response is safe */
  safe: boolean;

  /** List of violations found */
  violations: SafetyCheck[];

  /** Recommended action */
  action: 'allow' | 'redact' | 'block' | 'escalate';

  /** Redacted response if applicable */
  redactedResponse?: string;

  /** Reason for the decision */
  reason?: string;

  /** Whether immediate human intervention is needed */
  requiresImmediateEscalation: boolean;
}

// ============================================================
// ESCALATION TYPES
// ============================================================

/**
 * Reasons for escalation to human support
 */
export enum EscalationReason {
  LOW_CONFIDENCE = 'low_confidence',
  EMERGENCY = 'emergency',
  COMPLAINT = 'complaint',
  SENSITIVE_TOPIC = 'sensitive_topic',
  STUDENT_SAFETY = 'student_safety',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  USER_REQUEST = 'user_request',
  POLICY_VIOLATION = 'policy_violation',
  TECHNICAL_ERROR = 'technical_error',
}

/**
 * Escalation request
 */
export interface EscalationRequest {
  /** Reason for escalation */
  reason: EscalationReason;

  /** Priority level */
  priority: UrgencyLevel;

  /** Conversation context */
  conversationId: string;

  /** User involved */
  userId: string;

  /** District */
  districtId: string;

  /** Summary of the issue */
  summary: string;

  /** Full conversation history */
  conversationHistory?: ConversationMessage[];

  /** Any relevant data */
  metadata?: Record<string, unknown>;

  /** Timestamp */
  createdAt: Date;
}

// ============================================================
// AUDIT & LOGGING TYPES
// ============================================================

/**
 * AI operation audit log entry
 */
export interface AIAuditEntry {
  /** Unique entry ID */
  id: string;

  /** Timestamp */
  timestamp: Date;

  /** User who triggered the operation */
  userId: string;

  /** District */
  districtId: string;

  /** Operation type */
  operation: 'classification' | 'tool_execution' | 'response_generation' | 'safety_check';

  /** Details of the operation */
  details: {
    /** Input (sanitized) */
    input?: string;

    /** Output (sanitized) */
    output?: string;

    /** Tools used */
    toolsUsed?: string[];

    /** Success/failure */
    success: boolean;

    /** Error if failed */
    error?: string;

    /** Duration in ms */
    durationMs: number;
  };

  /** Any flags or concerns */
  flags?: string[];
}
