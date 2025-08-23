import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  userId?: string;

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
}