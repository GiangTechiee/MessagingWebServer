import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { ConversationType, Participants } from '@prisma/client';
import { ConversationCacheService } from './conversation-cache.service';
import { ConversationWithParticipants } from '../interface/conversation';
import { ConversationWithUnreadStatus } from '../interface/conversation';

@Injectable()
export class ConversationQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ConversationCacheService,
  ) {}

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationResponseDto> {
    const cachedConversation =
      await this.cacheService.getCachedConversation(conversationId);
    if (cachedConversation) {
      return cachedConversation;
    }

    const participant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Bạn không phải là thành viên của cuộc trò chuyện này.',
      );
    }

    const conversation = await this.prisma.conversations.findUnique({
      where: { conversationId, isActive: true },
      include: {
        creator: true,
        participants: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new BadRequestException(
        'Cuộc trò chuyện không tồn tại hoặc không hoạt động.',
      );
    }

    const conversationResponse = this.createConversationResponse(
      conversation,
      userId,
    );

    await this.cacheService.cacheConversation(
      conversationId,
      conversationResponse,
    );

    return conversationResponse;
  }

  async getConversations(
    userId: string,
    page: number,
    limit: number,
    type?: ConversationType,
  ): Promise<ConversationWithUnreadStatus[]> {
    const skip = (page - 1) * limit;

    const conversations = await this.prisma.conversations.findMany({
      where: {
        isActive: true,
        participants: {
          some: {
            userId,
            leftAt: null,
          },
        },
        ...(type && { type }),
      },
      include: {
        creator: true,
        participants: {
          where: {
            leftAt: null,
          },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          select: {
            updatedAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Chỉ lấy tin nhắn mới nhất
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Lấy thông tin lastReadAt của user hiện tại cho tất cả conversations
    const conversationIds = conversations.map((c) => c.conversationId);
    const userParticipants = await this.prisma.participants.findMany({
      where: {
        conversationId: { in: conversationIds },
        userId,
        leftAt: null,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    const lastReadMap = new Map(
      userParticipants.map((p) => [p.conversationId, p.lastReadAt]),
    );

    // Sắp xếp thủ công dựa trên updatedAt của tin nhắn mới nhất
    const sortedConversations = conversations.sort((a, b) => {
      const aTime = a.messages[0]?.updatedAt || a.updatedAt;
      const bTime = b.messages[0]?.updatedAt || b.updatedAt;
      return bTime.getTime() - aTime.getTime();
    });

    const conversationResponses = await Promise.all(
      sortedConversations.map(async (conversation) => {
        const baseResponse = this.createConversationResponse(
          conversation,
          userId,
        );
        const lastReadAt = lastReadMap.get(conversation.conversationId);
        const lastMessageAt = conversation.messages[0]?.updatedAt;

        // Kiểm tra có tin nhắn chưa đọc không
        const hasUnreadMessages = this.checkHasUnreadMessages(
          lastMessageAt,
          lastReadAt ?? null,
        );

        // Đếm số tin nhắn chưa đọc nếu cần
        let unreadCount = 0;
        if (hasUnreadMessages && lastReadAt) {
          unreadCount = await this.getUnreadMessageCount(
            conversation.conversationId,
            lastReadAt,
          );
        } else if (hasUnreadMessages && !lastReadAt) {
          // Nếu chưa đọc tin nhắn nào thì đếm tất cả tin nhắn
          unreadCount = await this.getTotalMessageCount(
            conversation.conversationId,
          );
        }

        return {
          ...baseResponse,
          hasUnreadMessages,
          unreadCount: unreadCount > 0 ? unreadCount : undefined,
        };
      }),
    );

    // Cache conversations
    for (const response of conversationResponses) {
      await this.cacheService.cacheConversation(
        response.conversationId,
        response,
      );
    }

    return conversationResponses;
  }

  private checkHasUnreadMessages(
    lastMessageAt: Date | undefined,
    lastReadAt: Date | null,
  ): boolean {
    if (!lastMessageAt) {
      return false; // Không có tin nhắn nào
    }

    if (!lastReadAt) {
      return true; // Chưa đọc tin nhắn nào
    }

    return lastMessageAt > lastReadAt;
  }

  private async getUnreadMessageCount(
    conversationId: string,
    lastReadAt: Date,
  ): Promise<number> {
    return await this.prisma.messages.count({
      where: {
        conversationId,
        createdAt: {
          gt: lastReadAt,
        },
        isDeleted: false,
      },
    });
  }

  private async getTotalMessageCount(conversationId: string): Promise<number> {
    return await this.prisma.messages.count({
      where: {
        conversationId,
        isDeleted: false,
      },
    });
  }

  private createConversationResponse(
    conversation: ConversationWithParticipants,
    userId?: string,
  ): ConversationResponseDto {
    const response: ConversationResponseDto = {
      conversationId: conversation.conversationId,
      title: conversation.title || 'default-title',
      type: conversation.type,
      creatorId: conversation.creatorId,
      isPublic: conversation.isPublic,
      isActive: conversation.isActive,
      groupAvatar: conversation.groupAvatar || 'avatars/default-avatar.jpg',
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.messages?.[0]?.updatedAt || undefined,
    };

    if (
      conversation.type === ConversationType.DIRECT &&
      userId &&
      conversation.participants
    ) {
      const oppositeParticipant = conversation.participants.find(
        (
          p: Participants & {
            user: {
              userId: string;
              username: string;
              fullName: string;
              avatar: string | null;
            };
          },
        ) => p.userId !== userId && p.leftAt === null,
      );
      if (oppositeParticipant) {
        response.oppositeUser = {
          userId: oppositeParticipant.userId,
          username: oppositeParticipant.user.username,
          fullName: oppositeParticipant.user.fullName,
          avatar: oppositeParticipant.user.avatar || 'avatars/default-avatar.jpg',
        };
      }
    } else if (
      conversation.type === ConversationType.DIRECT &&
      conversation.oppositeUser
    ) {
      response.oppositeUser = {
        userId: conversation.oppositeUser.userId,
        username: conversation.oppositeUser.username,
        fullName: conversation.oppositeUser.fullName,
        avatar: conversation.oppositeUser.avatar || 'avatars/default-avatar.jpg',
      };
    }

    return response;
  }
}
