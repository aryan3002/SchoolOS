/**
 * Conversation and Message Types
 */

import type { SourceCitation } from './knowledge';

/**
 * Message role
 */
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

/**
 * Conversation status
 */
export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Conversation
 */
export interface Conversation {
  id: string;
  districtId: string;
  userId: string;
  childId?: string;
  status: ConversationStatus;
  title?: string;
  summary?: string;
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  topic?: string;
  category?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  escalationReason?: string;
  resolvedBy?: string;
  [key: string]: unknown;
}

/**
 * Message
 */
export interface Message {
  id: string;
  conversationId: string;
  userId?: string;
  role: MessageRole;
  content: string;
  confidence?: number;
  sources: SourceCitation[];
  modelUsed?: string;
  toolCalls?: ToolCall[];
  rating?: number;
  feedback?: string;
  createdAt: Date;
}

/**
 * Tool call in assistant response
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

/**
 * Chat request
 */
export interface ChatRequest {
  message: string;
  conversationId?: string;
  childId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat response
 */
export interface ChatResponse {
  conversationId: string;
  message: Message;
  suggestedFollowUps?: string[];
}

/**
 * Streaming chat response event
 */
export interface ChatStreamEvent {
  type: 'content' | 'source' | 'tool_call' | 'done' | 'error';
  content?: string;
  source?: SourceCitation;
  toolCall?: ToolCall;
  error?: string;
  message?: Message;
}

/**
 * Conversation summary for list view
 */
export interface ConversationSummary {
  id: string;
  title?: string;
  status: ConversationStatus;
  lastMessageAt: Date;
  messageCount: number;
  childId?: string;
  childName?: string;
}

/**
 * Message feedback
 */
export interface MessageFeedback {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  categories?: string[];
}

/**
 * AI model configuration
 */
export interface AIModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

/**
 * Response generation context
 */
export interface GenerationContext {
  user: {
    id: string;
    role: string;
    firstName: string;
  };
  district: {
    id: string;
    name: string;
    timezone: string;
  };
  child?: {
    id: string;
    firstName: string;
    gradeLevel: string;
  };
  conversationHistory: Array<{
    role: MessageRole;
    content: string;
  }>;
  relevantSources: SourceCitation[];
}
