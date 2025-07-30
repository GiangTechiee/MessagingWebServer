import { IsString } from 'class-validator';

export class CreateJoinRequestDto {
  @IsString()
  conversationId: string;
}