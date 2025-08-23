import { IsOptional, IsBoolean } from 'class-validator';

export class CreateContactDto {
  @IsOptional()
  friendId: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isFriend?: boolean;
}