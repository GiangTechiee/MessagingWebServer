import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SocketGateway } from '../socket/socket.gateway';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantResponseDto, AddParticipantResponseDto } from './dto/participant-response.dto';
import { ParticipantRole } from '@prisma/client';

@Injectable()
export class ParticipantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async addParticipants(
    addParticipantDto: AddParticipantDto,
    skipActiveCheck: boolean = false,
  ): Promise<AddParticipantResponseDto> {
    const { conversationId, participants } = addParticipantDto;

    // Kiểm tra conversation
    if (!skipActiveCheck) {
      const conversation = await this.prisma.conversations.findUnique({
        where: { conversationId, isActive: true },
      });
      if (!conversation) {
        throw new BadRequestException('Conversation not found or inactive.');
      }
    }

    const result: AddParticipantResponseDto = {
      success: [],
      failed: [],
      total: participants.length,
      successCount: 0,
      failedCount: 0,
    };

    // Xử lý từng participant
    for (const participantData of participants) {
      try {
        const participantResponse = await this.addSingleParticipant(
          conversationId,
          participantData.userId,
          participantData.role,
        );
        result.success.push(participantResponse);
        result.successCount++;

        // Thông báo qua WebSocket cho từng participant thành công
        this.socketGateway.notifyParticipantAdded(
          conversationId,
          participantResponse,
        );
      } catch (error) {
        result.failed.push({
          userId: participantData.userId,
          role: participantData.role,
          error: error.message,
        });
        result.failedCount++;
      }
    }

    // Xóa cache conversation để force refresh khi get
    await this.redis.del(`conversation:${conversationId}`);

    return result;
  }

  private async addSingleParticipant(
    conversationId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<ParticipantResponseDto> {
    // Kiểm tra user
    const user = await this.prisma.users.findUnique({
      where: { userId, isActive: true },
    });
    if (!user) {
      throw new BadRequestException('User not found or inactive.');
    }

    // Kiểm tra xem user đã là participant chưa (bao gồm cả những người đã rời)
    const existingParticipant = await this.prisma.participants.findFirst({
      where: { conversationId, userId },
    });

    let participant;

    if (existingParticipant) {
      // Nếu user đã từng là participant nhưng đã rời, cho phép join lại
      if (existingParticipant.leftAt !== null) {
        participant = await this.prisma.participants.update({
          where: {
            conversationId_userId: { conversationId, userId },
          },
          data: {
            role,
            joinedAt: new Date(),
            leftAt: null, // Reset leftAt
            isMuted: false, // Reset trạng thái mute
            lastReadAt: null, // Reset lastReadAt
          },
          include: { user: true, conversation: true },
        });
      } else {
        // User hiện tại vẫn là participant active
        throw new BadRequestException('User is already a participant.');
      }
    } else {
      // Tạo participant mới
      participant = await this.prisma.participants.create({
        data: {
          conversationId,
          userId,
          role,
          joinedAt: new Date(),
        },
        include: { user: true, conversation: true },
      });
    }

    const participantResponse: ParticipantResponseDto = {
      participantId: participant.participantId.toString(),
      conversationId: participant.conversationId,
      userId: participant.userId,
      role: participant.role,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      isMuted: participant.isMuted,
      lastReadAt: participant.lastReadAt,
    };

    return participantResponse;
  }

  // Giữ nguyên method cũ để backward compatibility
  async addParticipant(
    addParticipantDto: { conversationId: string; userId: string; role: ParticipantRole },
    skipActiveCheck: boolean = false,
  ): Promise<ParticipantResponseDto> {
    const newDto: AddParticipantDto = {
      conversationId: addParticipantDto.conversationId,
      participants: [
        {
          userId: addParticipantDto.userId,
          role: addParticipantDto.role,
        },
      ],
    };

    const result = await this.addParticipants(newDto, skipActiveCheck);
    
    if (result.failedCount > 0) {
      throw new BadRequestException(result.failed[0].error);
    }

    return result.success[0];
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> {
    // Kiểm tra quyền admin/moderator hoặc chính user muốn rời
    const requester = await this.prisma.participants.findFirst({
      where: {
        conversationId,
        userId: requesterId,
        leftAt: null,
      },
    });

    if (!requester) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    // Chỉ admin/moderator mới có thể kick người khác, còn user có thể tự rời
    if (
      requesterId !== userId &&
      requester.role !== ParticipantRole.ADMIN &&
      requester.role !== ParticipantRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'Only admin or moderator can remove other participants.',
      );
    }

    // Cập nhật leftAt thay vì xóa record
    await this.prisma.participants.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Xóa cache conversation
    await this.redis.del(`conversation:${conversationId}`);

    // Thông báo qua WebSocket
    const reason = requesterId === userId ? 'left' : 'removed';
    this.socketGateway.notifyParticipantRemoved(
      conversationId,
      userId,
      requesterId,
      reason,
    );
  }

  async updateParticipant(
    conversationId: string,
    userId: string,
    updateParticipantDto: UpdateParticipantDto,
    requesterId: string,
  ): Promise<ParticipantResponseDto> {
    // Kiểm tra quyền admin/moderator
    const requester = await this.prisma.participants.findFirst({
      where: {
        conversationId,
        userId: requesterId,
        role: { in: [ParticipantRole.ADMIN, ParticipantRole.MODERATOR] },
        leftAt: null,
      },
    });
    if (!requester) {
      throw new ForbiddenException(
        'Only admin or moderator can update participant.',
      );
    }

    // Không cho phép tự demote bản thân nếu là admin duy nhất
    if (
      requesterId === userId &&
      updateParticipantDto.role === ParticipantRole.MEMBER
    ) {
      const adminCount = await this.prisma.participants.count({
        where: {
          conversationId,
          role: ParticipantRole.ADMIN,
          leftAt: null,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last admin of the conversation.',
        );
      }
    }

    const participant = await this.prisma.participants.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: updateParticipantDto,
      include: { user: true, conversation: true },
    });

    const participantResponse: ParticipantResponseDto = {
      participantId: participant.participantId.toString(),
      conversationId: participant.conversationId,
      userId: participant.userId,
      role: participant.role,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      isMuted: participant.isMuted,
      lastReadAt: participant.lastReadAt,
    };

    // Xóa cache conversation
    await this.redis.del(`conversation:${conversationId}`);

    // Thông báo qua WebSocket
    this.socketGateway.notifyParticipantUpdated(
      conversationId,
      participantResponse,
    );

    return participantResponse;
  }

  async getParticipants(
    conversationId: string,
    userId: string,
  ): Promise<ParticipantResponseDto[]> {
    // Kiểm tra xem user có phải là participant không
    const participant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    const participants = await this.prisma.participants.findMany({
      where: {
        conversationId,
        leftAt: null, // Chỉ lấy những người chưa rời
      },
      include: { user: true },
      orderBy: [
        { role: 'asc' }, // ADMIN trước, MEMBER sau
        { joinedAt: 'asc' },
      ],
    });

    return participants.map((p) => ({
      participantId: p.participantId.toString(),
      conversationId: p.conversationId,
      userId: p.userId,
      role: p.role,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      isMuted: p.isMuted,
      lastReadAt: p.lastReadAt,
    }));
  }
}