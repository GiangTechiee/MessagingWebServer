import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  notificationId: string;
  userId: string;
  title?: string;
  message?: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}