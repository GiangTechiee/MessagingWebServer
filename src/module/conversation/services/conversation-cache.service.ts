import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { MessageResponseDto } from '../../message/dto/message-response.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';

@Injectable()
export class ConversationCacheService {
  constructor(private readonly redis: RedisService) {}

  async cacheConversation(
    conversationId: string,
    conversation: ConversationResponseDto,
    ttl: number = 3600,
  ): Promise<void> {
    await this.redis.set(`conversation:${conversationId}`, conversation, ttl);
  }

  async getCachedConversation(
    conversationId: string,
  ): Promise<ConversationResponseDto | null> {
    return await this.redis.get<ConversationResponseDto>(
      `conversation:${conversationId}`,
    );
  }

  async cacheRecentMessages(
    conversationId: string,
    messages: MessageResponseDto[],
  ): Promise<void> {
    const key = `conversation:${conversationId}:recentMessages`;
    for (const message of messages) {
      await this.redis.addToList(key, message);
    }
    await this.redis.client.ltrim(key, 0, 49); // Giới hạn 50 tin nhắn
  }

  async getRecentMessages(
    conversationId: string,
  ): Promise<MessageResponseDto[]> {
    const key = `conversation:${conversationId}:recentMessages`;
    return await this.redis.getList<MessageResponseDto>(key, 0, 49);
  }
}
