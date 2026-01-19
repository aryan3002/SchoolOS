/**
 * Chat Controller
 *
 * REST API endpoints for the conversational AI interface.
 *
 * @module @schoolos/api/chat
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import {
  SendMessageDto,
  SendMessageResponseDto,
  ListConversationsDto,
  ListConversationsResponseDto,
  ConversationDto,
  DeleteConversationResponseDto,
} from './dto';
import { SendMessageInput } from './conversation.service';
import { UserContext } from '@schoolos/ai';

// ============================================================
// REQUEST WITH USER
// ============================================================

interface AuthenticatedRequest {
  user: {
    id: string;
    districtId: string;
    role: string;
    schoolId?: string;
    childIds?: string[];
    schoolIds?: string[];
    email?: string;
    displayName?: string;
    permissions?: string[];
  };
}

// ============================================================
// CHAT CONTROLLER
// ============================================================

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * Send a message and receive an AI response
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Send a message to the AI assistant and receive a contextual response. ' +
      'Optionally provide a conversationId to continue an existing conversation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: SendMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResponseDto> {
    const userContext: UserContext = {
      userId: req.user.id,
      districtId: req.user.districtId,
      role: req.user.role as UserContext['role'],
      schoolIds: req.user.schoolIds ?? (req.user.schoolId ? [req.user.schoolId] : undefined),
      email: req.user.email,
      displayName: req.user.displayName ?? req.user.id,
      childIds: req.user.childIds,
      permissions: req.user.permissions,
    };

    try {
      const payload: SendMessageInput = {
        message: dto.message,
        userContext,
        ...(dto.metadata ? { metadata: dto.metadata } : {}),
      };

      if (dto.conversationId) {
        payload.conversationId = dto.conversationId;
      }

      const result = await this.conversationService.sendMessage(payload);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * List user's conversations
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations',
    description: 'Get a paginated list of the user\'s conversations',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    type: ListConversationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async listConversations(
    @Query() dto: ListConversationsDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ListConversationsResponseDto> {
    const options =
      dto.limit !== undefined || dto.offset !== undefined
        ? {
            ...(dto.limit !== undefined ? { limit: dto.limit } : {}),
            ...(dto.offset !== undefined ? { offset: dto.offset } : {}),
          }
        : undefined;

    return this.conversationService.listConversations(
      req.user.id,
      req.user.districtId,
      options,
    );
  }

  /**
   * Get a specific conversation with messages
   */
  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation',
    description: 'Get a specific conversation with all its messages',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
    type: ConversationDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  async getConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ConversationDto> {
    const conversation = await this.conversationService.getConversation(id, req.user.id);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: conversation.id,
      messages: conversation.messages.map((m) => ({
        id: m.id ?? '',
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        ...(m.metadata ? { metadata: m.metadata } : {}),
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Delete a conversation
   */
  @Delete('conversations/:id')
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Delete a specific conversation and all its messages',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
    type: DeleteConversationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  async deleteConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<DeleteConversationResponseDto> {
    const deleted = await this.conversationService.deleteConversation(id, req.user.id);

    if (!deleted) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      success: true,
      conversationId: id,
    };
  }
}
