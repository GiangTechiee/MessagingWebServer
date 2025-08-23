import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Nội dung tin nhắn không được vượt quá 255 ký tự' })
  content?: string; 

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @IsString()
  @IsOptional()
  replyToMessageId?: string;
}