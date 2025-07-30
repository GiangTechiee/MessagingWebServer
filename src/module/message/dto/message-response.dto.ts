import { MessageType } from "@prisma/client";

export class AttachmentResponseDto {
  attachmentId: string;
  fileName: string;
  fileUrl: string;
  size?: number;
  fileType: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export class MessageResponseDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  content?: string;
  messageType: MessageType;
  replyToMessageId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachments?: AttachmentResponseDto[];
}