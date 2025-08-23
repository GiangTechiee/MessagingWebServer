import { ConversationType, Participants } from "@prisma/client";
import { ConversationResponseDto } from "../dto/conversation-response.dto";

export interface ConversationWithParticipants {
  conversationId: string;
  title: string | null;
  type: ConversationType;
  creatorId: string;
  isPublic: boolean;
  isActive: boolean;
  groupAvatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants?: Array<
    Participants & {
      user: {
        userId: string;
        username: string;
        fullName: string;
        avatar: string | null;
      };
    }
  >;
  oppositeUser?: {
    userId: string;
    username: string;
    fullName: string;
    avatar: string | null;
  };
  messages?: Array<{
    updatedAt: Date;
  }>;
}

export interface ConversationWithUnreadStatus extends ConversationResponseDto {
  hasUnreadMessages: boolean;
  unreadCount?: number;
}