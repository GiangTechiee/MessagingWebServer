import { Injectable } from '@nestjs/common';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { ConversationType } from '@prisma/client';
import { MessageResponseDto } from '../../message/dto/message-response.dto';
import { ConversationCacheService } from './conversation-cache.service';
import { ConversationQueryService } from './conversation-query.service';
import { ConversationManagementService } from './conversation-management.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly cacheService: ConversationCacheService,
    private readonly queryService: ConversationQueryService,
    private readonly managementService: ConversationManagementService,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
    groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    return this.managementService.createConversation(
      userId,
      createConversationDto,
      groupAvatar,
    );
  }

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationResponseDto> {
    return this.queryService.getConversation(conversationId, userId);
  }

  async getConversations(
    userId: string,
    page: number,
    limit: number,
    type?: ConversationType,
  ): Promise<ConversationResponseDto[]> {
    return this.queryService.getConversations(userId, page, limit, type);
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updateConversationDto: UpdateConversationDto,
    groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    return this.managementService.updateConversation(
      conversationId,
      userId,
      updateConversationDto,
      groupAvatar,
    );
  }

  async cacheRecentMessages(
    conversationId: string,
    messages: MessageResponseDto[],
  ): Promise<void> {
    await this.cacheService.cacheRecentMessages(conversationId, messages);
  }

  async getRecentMessages(
    conversationId: string,
  ): Promise<MessageResponseDto[]> {
    return await this.cacheService.getRecentMessages(conversationId);
  }
}
