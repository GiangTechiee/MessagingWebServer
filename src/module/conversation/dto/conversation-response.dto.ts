import { ConversationType } from "@prisma/client";

export class ConversationResponseDto {
  conversationId: string;
  title?: string;
  type: ConversationType;
  creatorId: string;
  isPublic: boolean;
  isActive: boolean;
  groupAvatar: string;
  createdAt: Date;
  updatedAt: Date;
  oppositeUser?: {
    userId: string;
    username: string;
    avatar: string | null;
  }; // Chỉ dùng cho type DIRECT
}