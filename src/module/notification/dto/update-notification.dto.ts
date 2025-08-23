import { IsString, IsOptional, IsEnum, MaxLength, IsBoolean } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}