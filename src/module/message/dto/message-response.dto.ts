import { FileType, MessageType } from "@prisma/client";

export class AttachmentResponseDto {
  attachmentId: string;
  fileName: string;
  fileUrl: string;
  size?: number;
  fileType: FileType;
  thumbnailUrl?: string;
  createdAt: Date;
}

export class MessageResponseDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  content?: string;
  messageType: MessageType;
  replyToMessageId?: string;
  replyToContent?: string;
  replyToUsername?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachments?: AttachmentResponseDto[];
}