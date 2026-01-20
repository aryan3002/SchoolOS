/**
 * Chat DTOs
 *
 * Data Transfer Objects for the Chat API endpoints.
 *
 * @module @schoolos/api/chat
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================
// REQUEST DTOs
// ============================================================

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'Existing conversation ID. Leave empty to start a new conversation.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description: 'The message content to send',
    example: 'What is the school policy on tardiness?',
    minLength: 1,
    maxLength: 4000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional metadata to attach to the message',
    example: { source: 'mobile_app' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListConversationsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of conversations to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of conversations to skip (for pagination)',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

// ============================================================
// RESPONSE DTOs
// ============================================================

export class CitationDto {
  @ApiProperty({
    description: 'Source document ID',
    example: 'doc-123',
  })
  sourceId!: string;

  @ApiProperty({
    description: 'Title of the source document',
    example: 'Student Handbook 2024-2025',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Relevant excerpt from the source',
    example: 'Students arriving more than 10 minutes late...',
  })
  excerpt?: string;
}

export class IntentDto {
  @ApiProperty({
    description: 'Classified intent category',
    example: 'general',
  })
  category!: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.85,
  })
  confidence!: number;

  @ApiProperty({
    description: 'Urgency level',
    example: 'low',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  urgency!: string;

  @ApiProperty({
    description: 'Whether tools are required',
    example: false,
  })
  requiresTools!: boolean;
}

export class ToolResultDto {
  @ApiProperty({
    description: 'Whether tool execution was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Tool execution result content',
    example: 'No tools were executed in this request.',
  })
  content!: string;

  @ApiProperty({
    description: 'Citations from tool execution',
    type: [CitationDto],
  })
  citations!: CitationDto[];
}

export class GeneratedResponseDto {
  @ApiProperty({
    description: 'Generated response content',
    example: 'According to the policy...',
  })
  content!: string;

  @ApiProperty({
    description: 'Citations supporting the response',
    type: [CitationDto],
  })
  citations!: CitationDto[];
}

export class MessageDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id!: string;

  @ApiProperty({
    description: 'Message content',
    example: 'What is the school policy?',
  })
  content!: string;

  @ApiProperty({
    description: 'Message role',
    example: 'USER',
  })
  role!: string;
}

export class MessageMetadataDto {
  @ApiProperty({
    description: 'Classified intent category',
    example: 'POLICY_QUESTION',
  })
  intentCategory!: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.92,
  })
  confidence!: number;

  @ApiProperty({
    description: 'Tools used to generate the response',
    example: ['knowledge_retrieval'],
    type: [String],
  })
  toolsUsed!: string[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 1250,
  })
  processingTimeMs!: number;
}

/**
 * CANONICAL Response for POST /api/v1/chat/message
 * 
 * This is the locked Phase 0 contract. Changes require E2E test updates.
 */
export class SendMessageResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversationId!: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'Policy Questions',
  })
  conversationTitle!: string;

  @ApiProperty({
    description: 'The user message that was sent',
    type: MessageDto,
  })
  message!: MessageDto;

  @ApiProperty({
    description: 'Classified intent',
    type: IntentDto,
  })
  intent!: IntentDto;

  @ApiProperty({
    description: 'Tool execution result',
    type: ToolResultDto,
  })
  toolResult!: ToolResultDto;

  @ApiProperty({
    description: 'Generated response',
    type: GeneratedResponseDto,
  })
  response!: GeneratedResponseDto;
}

export class ConversationMessageDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id!: string;

  @ApiProperty({
    description: 'Message role',
    enum: ['user', 'assistant', 'system'],
    example: 'user',
  })
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({
    description: 'Message content',
    example: 'What is the school policy on tardiness?',
  })
  content!: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp!: Date;

  @ApiPropertyOptional({
    description: 'Message metadata',
  })
  metadata?: Record<string, unknown>;
}

export class ConversationDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Attendance Policy Questions',
  })
  title?: string;

  @ApiProperty({
    description: 'Conversation status',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({
    description: 'Conversation messages',
    type: [ConversationMessageDto],
  })
  messages!: ConversationMessageDto[];

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Conversation last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;
}

export class ConversationSummaryDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Tardiness Policy Questions',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Last message preview',
    example: 'According to the Student Handbook...',
  })
  lastMessage?: string;

  @ApiProperty({
    description: 'Number of messages in conversation',
    example: 5,
  })
  messageCount!: number;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Conversation last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;
}

export class ListConversationsResponseDto {
  @ApiProperty({
    description: 'List of conversations',
    type: [ConversationSummaryDto],
  })
  conversations!: ConversationSummaryDto[];

  @ApiProperty({
    description: 'Total number of conversations',
    example: 42,
  })
  total!: number;
}

export class DeleteConversationResponseDto {
  @ApiProperty({
    description: 'Whether the deletion was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Deleted conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversationId!: string;
}
