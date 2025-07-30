import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  @IsOptional()
  title?: string;

  @IsBoolean({ message: 'isPublic must be a boolean value' })
  @IsOptional()
  isPublic?: boolean;

  @IsString({ message: 'groupAvatar must be a string' })
  @IsOptional()
  groupAvatar?: string;
}