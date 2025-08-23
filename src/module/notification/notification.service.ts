import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto, userId: string) {
    const notification = await this.prisma.notifications.create({
      data: {
        userId: createNotificationDto.userId || userId,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type || NotificationType.OTHER,
        isRead: false,
      },
    });
    return {
      ...notification,
      notificationId: notification.notificationId.toString(),
    };
  }

  async findAll(userId: string, isRead?: boolean) {
    const notifications = await this.prisma.notifications.findMany({
      where: {
        userId,
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map((notification) => ({
      ...notification,
      notificationId: notification.notificationId.toString(),
    }));
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { notificationId: BigInt(id), userId },
    });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    return {
      ...notification,
      notificationId: notification.notificationId.toString(),
    };
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto, userId: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { notificationId: BigInt(id), userId },
    });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    const updatedNotification = await this.prisma.notifications.update({
      where: { notificationId: BigInt(id) },
      data: {
        title: updateNotificationDto.title,
        message: updateNotificationDto.message,
        type: updateNotificationDto.type,
        isRead: updateNotificationDto.isRead,
      },
    });
    return {
      ...updatedNotification,
      notificationId: updatedNotification.notificationId.toString(),
    };
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { notificationId: BigInt(id), userId },
    });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    const deletedNotification = await this.prisma.notifications.delete({
      where: { notificationId: BigInt(id) },
    });
    return {
      ...deletedNotification,
      notificationId: deletedNotification.notificationId.toString(),
    };
  }
}