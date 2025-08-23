import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import {
  ConversationType,
  ParticipantRole,
  Participants,
} from '@prisma/client';
import { SocketGateway } from '../../socket/socket.gateway';
import { ConversationCacheService } from './conversation-cache.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import * as sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { ConversationWithParticipants } from '../interface/conversation';

@Injectable()
export class ConversationManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ConversationCacheService,
    private readonly socketGateway: SocketGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
    groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    const { title, type, isPublic, participantIds } = createConversationDto;

    const uniqueParticipantIds = participantIds.filter((id) => id !== userId);

    const users = await this.prisma.users.findMany({
      where: { userId: { in: uniqueParticipantIds }, isActive: true },
      select: { userId: true, username: true, fullName: true, avatar: true },
    });
    this.validateConversationCreationInput(type, uniqueParticipantIds, users);

    if (type === ConversationType.DIRECT) {
      await this.checkExistingDirectConversation(
        userId,
        uniqueParticipantIds[0],
      );
    }

    return this.prisma.executeTransaction(async (prisma) => {
      let uploadedAvatarUrl: string | null = null;

      if (groupAvatar && type === ConversationType.GROUP) {
        if (!groupAvatar.mimetype.startsWith('image/')) {
          throw new BadRequestException(
            'Chỉ chấp nhận file ảnh cho avatar nhóm',
          );
        }

        const processedBuffer = await this.resizeImageIfNeeded(groupAvatar);
        try {
          const result = await this.cloudinaryService.uploadFile(
            { ...groupAvatar, buffer: processedBuffer },
            'image',
            'group_avatars',
          );
          uploadedAvatarUrl = result.secure_url;
        } catch (error) {
          console.error(
            'ConversationManagementService: Lỗi khi upload avatar nhóm lên Cloudinary',
            {
              error: error.message,
              stack: error.stack,
            },
          );
          throw new InternalServerErrorException(
            'Không thể upload avatar nhóm lên Cloudinary',
          );
        }
      }

      const conversation = await prisma.conversations.create({
        data: {
          title: type === ConversationType.DIRECT ? null : title,
          type,
          isPublic,
          isActive: true,
          groupAvatar:
            type === ConversationType.DIRECT
              ? null
              : uploadedAvatarUrl || 'avatars/default-group-avatar.jpg',
          createdAt: new Date(),
          creatorId: userId,
        },
        include: { creator: true },
      });

      await this.addParticipantsToConversation(
        conversation.conversationId,
        userId,
        uniqueParticipantIds,
        type,
        prisma,
      );

      const conversationResponse = this.createConversationResponse({
        ...conversation,
        oppositeUser:
          type === ConversationType.DIRECT
            ? users.find((u) => u.userId === uniqueParticipantIds[0])
            : undefined,
      });

      await this.cacheService.cacheConversation(
        conversation.conversationId,
        conversationResponse,
      );

      this.socketGateway.notifyConversationCreated(
        conversation.conversationId,
        [userId, ...uniqueParticipantIds],
      );

      return conversationResponse;
    });
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updateConversationDto: UpdateConversationDto,
    groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    const participant = await this.prisma.participants.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Bạn không phải là thành viên của cuộc trò chuyện này.',
      );
    }

    const conversation = await this.prisma.conversations.findUnique({
      where: { conversationId },
      select: { type: true, isActive: true, groupAvatar: true },
    });

    if (!conversation) {
      throw new BadRequestException('Cuộc trò chuyện không tồn tại.');
    }

    if (!conversation.isActive) {
      throw new BadRequestException(
        'Không thể cập nhật cuộc trò chuyện không hoạt động.',
      );
    }

    if (conversation.type === ConversationType.DIRECT) {
      const hasAnyUpdate =
        Object.keys(updateConversationDto).some(
          (key) =>
            updateConversationDto[key as keyof UpdateConversationDto] !==
            undefined,
        ) || groupAvatar;

      if (hasAnyUpdate) {
        throw new ForbiddenException(
          'Không thể cập nhật cuộc trò chuyện trực tiếp.',
        );
      }
    } else {
      const allowedRoles: ParticipantRole[] = [
        ParticipantRole.ADMIN,
        ParticipantRole.MODERATOR,
      ];

      if (!allowedRoles.includes(participant.role)) {
        throw new ForbiddenException(
          'Chỉ quản trị viên hoặc người điều hành mới có thể cập nhật chi tiết cuộc trò chuyện nhóm.',
        );
      }
    }

    let uploadedAvatarUrl: string | null = null;
    if (groupAvatar) {
      if (!groupAvatar.mimetype.startsWith('image/')) {
        throw new BadRequestException('Chỉ chấp nhận file ảnh cho avatar nhóm');
      }

      const processedBuffer = await this.resizeImageIfNeeded(groupAvatar);
      try {
        await this.deleteOldFile(conversation.groupAvatar);
        const result = await this.cloudinaryService.uploadFile(
          { ...groupAvatar, buffer: processedBuffer },
          'image',
          'group_avatars',
        );
        uploadedAvatarUrl = result.secure_url;
      } catch (error) {
        console.error(
          'ConversationManagementService: Lỗi khi upload avatar nhóm lên Cloudinary',
          {
            error: error.message,
            stack: error.stack,
          },
        );
        throw new InternalServerErrorException(
          'Không thể upload avatar nhóm lên Cloudinary',
        );
      }
    }

    const updatedConversation = await this.prisma.conversations.update({
      where: { conversationId },
      data: {
        ...updateConversationDto,
        groupAvatar: uploadedAvatarUrl || undefined,
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const conversationResponse = this.createConversationResponse(
      updatedConversation,
      userId,
    );

    await this.cacheService.cacheConversation(
      conversationId,
      conversationResponse,
    );

    this.socketGateway.notifyConversationUpdated(
      conversationId,
      updatedConversation.participants.map((p) => p.userId),
    );

    return conversationResponse;
  }

  private async resizeImageIfNeeded(
    file: Express.Multer.File,
  ): Promise<Buffer> {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size <= MAX_SIZE) {
      return file.buffer;
    }

    try {
      const resizedBuffer = await sharp(file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      return resizedBuffer;
    } catch (error) {
      console.error(
        'ConversationManagementService: Lỗi khi resize ảnh với sharp',
        {
          error: error.message,
          stack: error.stack,
        },
      );
      throw new InternalServerErrorException('Không thể xử lý ảnh');
    }
  }

  private async deleteOldFile(url: string | null): Promise<void> {
    if (!url) {
      return;
    }

    const publicId = url.split('/').slice(-2).join('/').split('.')[0];
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error(
        'ConversationManagementService: Lỗi khi xóa file cũ trên Cloudinary',
        {
          publicId,
          error: error.message,
          stack: error.stack,
        },
      );
      // Tiếp tục dù xóa thất bại
    }
  }

  private validateConversationCreationInput(
    type: ConversationType,
    participantIds: string[],
    users: {
      userId: string;
      username: string;
      fullName: string;
      avatar: string | null;
    }[],
  ): void {
    if (type === ConversationType.GROUP && participantIds.length < 2) {
      throw new BadRequestException(
        'Cuộc trò chuyện nhóm phải có ít nhất 3 thành viên (bao gồm người tạo).',
      );
    }
    if (type === ConversationType.DIRECT && participantIds.length !== 1) {
      throw new BadRequestException(
        'Cuộc trò chuyện trực tiếp phải có đúng một thành viên khác.',
      );
    }
    if (users.length !== participantIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều ID thành viên không hợp lệ hoặc không hoạt động.',
      );
    }
  }

  private async addParticipantsToConversation(
    conversationId: string,
    creatorId: string,
    participantIds: string[],
    type: ConversationType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaInstance?: any,
  ): Promise<void> {
    const prisma = prismaInstance || this.prisma;

    await prisma.participants.create({
      data: {
        conversationId,
        userId: creatorId,
        role:
          type === ConversationType.DIRECT
            ? ParticipantRole.MEMBER
            : ParticipantRole.ADMIN,
        joinedAt: new Date(),
      },
    });

    for (const participantId of participantIds) {
      await prisma.participants.create({
        data: {
          conversationId,
          userId: participantId,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date(),
        },
      });
    }
  }

  private createConversationResponse(
    conversation: ConversationWithParticipants,
    userId?: string,
  ): ConversationResponseDto {
    const response: ConversationResponseDto = {
      conversationId: conversation.conversationId,
      title: conversation.title || 'default-title',
      type: conversation.type,
      creatorId: conversation.creatorId,
      isPublic: conversation.isPublic,
      isActive: conversation.isActive,
      groupAvatar: conversation.groupAvatar || 'avatars/default-group-avatar.jpg',
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.messages?.[0]?.updatedAt || undefined,
    };

    if (
      conversation.type === ConversationType.DIRECT &&
      userId &&
      conversation.participants
    ) {
      const oppositeParticipant = conversation.participants.find(
        (
          p: Participants & {
            user: {
              userId: string;
              username: string;
              fullName: string;
              avatar: string | null;
            };
          },
        ) => p.userId !== userId && p.leftAt === null,
      );
      if (oppositeParticipant) {
        response.oppositeUser = {
          userId: oppositeParticipant.userId,
          username: oppositeParticipant.user.username,
          fullName: oppositeParticipant.user.fullName,
          avatar: oppositeParticipant.user.avatar || 'avatars/default-avatar.jpg',
        };
      }
    } else if (
      conversation.type === ConversationType.DIRECT &&
      conversation.oppositeUser
    ) {
      response.oppositeUser = {
        userId: conversation.oppositeUser.userId,
        username: conversation.oppositeUser.username,
        fullName: conversation.oppositeUser.fullName,
        avatar: conversation.oppositeUser.avatar || 'avatars/default-avatar.jpg',
      };
    }

    return response;
  }

  private async checkExistingDirectConversation(
    userId: string,
    participantId: string,
  ): Promise<void> {
    const existingConversation = await this.prisma.conversations.findFirst({
      where: {
        type: ConversationType.DIRECT,
        isActive: true,
        participants: {
          every: {
            userId: { in: [userId, participantId] },
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (
      existingConversation &&
      existingConversation.participants.length === 2 &&
      existingConversation.participants.every((p) =>
        [userId, participantId].includes(p.userId),
      )
    ) {
      throw new BadRequestException(
        'Đã tồn tại một cuộc trò chuyện trực tiếp với người dùng này.',
      );
    }
  }
}
