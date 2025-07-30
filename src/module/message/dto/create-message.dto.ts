import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  @IsOptional()
  content?: string; 

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @IsString()
  @IsOptional()
  replyToMessageId?: string;
}