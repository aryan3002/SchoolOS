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
      schoolId: req.user.schoolId,
      childIds: req.user.childIds,
    };

    try {
      const result = await this.conversationService.sendMessage({
        conversationId: dto.conversationId,
        message: dto.message,
        userContext,
        metadata: dto.metadata,
      });

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
    return this.conversationService.listConversations(
      req.user.id,
      req.user.districtId,
      {
        limit: dto.limit,
        offset: dto.offset,
      },
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

    return conversation;
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
