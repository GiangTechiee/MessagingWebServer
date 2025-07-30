import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}