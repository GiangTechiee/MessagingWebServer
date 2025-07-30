import { IsEnum, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantRole } from '@prisma/client';

export class SingleParticipantDto {
  @IsString({ message: 'User ID phải là chuỗi' })
  userId: string;

  @IsEnum(ParticipantRole, { message: 'Role phải là ADMIN, MODERATOR hoặc MEMBER' })
  role: ParticipantRole;
}

export class AddParticipantDto {
  @IsString({ message: 'Conversation ID phải là chuỗi' })
  conversationId: string;

  @IsArray({ message: 'Participants phải là một mảng' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 participant' })
  @ValidateNested({ each: true })
  @Type(() => SingleParticipantDto)
  participants: SingleParticipantDto[];
}