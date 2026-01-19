/**
 * Chat Module
 *
 * NestJS module for the conversational AI interface.
 *
 * @module @schoolos/api/chat
 */

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [DatabaseModule, KnowledgeModule],
  controllers: [ChatController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ChatModule {}
