import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsEnum(ConversationType)
  type: ConversationType;

  @IsBoolean()
  isPublic: boolean;

  @IsString()
  @IsOptional()
  groupAvatar?: string;

  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}