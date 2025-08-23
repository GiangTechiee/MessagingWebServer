import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SocketGateway } from '../socket/socket.gateway';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { RespondJoinRequestDto } from './dto/join-request-respond.dto';
import { JoinRequestResponseDto } from './dto/join-request-response.dto';
import { RequestStatus, ParticipantRole } from '@prisma/client';
import { ParticipantResponseDto } from '../participant/dto/participant-response.dto';

@Injectable()
export class JoinRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async createJoinRequest(
    createJoinRequestDto: CreateJoinRequestDto,
    userId: string
  ): Promise<JoinRequestResponseDto | { message: string; participant: ParticipantResponseDto }> {
    const { conversationId } = createJoinRequestDto;

    // Kiểm tra conversation
    const conversation = await this.prisma.conversations.findUnique({
      where: { conversationId, isActive: true },
    });
    if (!conversation) {
      throw new BadRequestException('Conversation not found or inactive.');
    }

    // Kiểm tra xem conversation có phải là GROUP không
    if (conversation.type !== 'GROUP') {
      throw new BadRequestException(
        'Join requests are only available for group conversations.',
      );
    }

    // Kiểm tra user
    const user = await this.prisma.users.findUnique({
      where: { userId, isActive: true },
    });
    if (!user) {
      throw new BadRequestException('User not found or inactive.');
    }

    // Kiểm tra xem user đã là participant chưa
    const existingParticipant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    if (existingParticipant) {
      throw new BadRequestException('User is already a participant.');
    }

    // Nếu là nhóm PUBLIC - tự động join luôn
    if (conversation.isPublic) {
      const newParticipant = await this.prisma.participants.create({
        data: {
          conversationId,
          userId,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date(),
        },
        include: { user: true, conversation: true },
      });

      const participantResponse: ParticipantResponseDto = {
        participantId: newParticipant.participantId.toString(),
        conversationId: newParticipant.conversationId,
        userId: newParticipant.userId,
        role: newParticipant.role,
        joinedAt: newParticipant.joinedAt,
        leftAt: newParticipant.leftAt,
        isMuted: newParticipant.isMuted,
        lastReadAt: newParticipant.lastReadAt,
      };

      // Thông báo qua WebSocket về participant mới
      this.socketGateway.notifyParticipantAdded(conversationId, participantResponse);

      // Tạo notification cho user
      await this.prisma.notifications.create({
        data: {
          userId,
          title: 'Joined Group Successfully',
          message: `You have successfully joined ${conversation.title || 'the group'}`,
          type: 'GROUP_INVITE',
        },
      });

      return {
        message: 'Successfully joined the public group',
        participant: participantResponse,
      };
    }

    // Nếu là nhóm PRIVATE - tạo join request
    // Kiểm tra xem đã có join request đang chờ xử lý chưa
    const existingRequest = await this.prisma.joinRequests.findFirst({
      where: { conversationId, userId, status: RequestStatus.PENDING },
    });
    if (existingRequest) {
      throw new BadRequestException('A pending join request already exists.');
    }

    const joinRequest = await this.prisma.joinRequests.create({
      data: {
        conversationId,
        userId,
        status: RequestStatus.PENDING,
        requestedAt: new Date(),
      },
      include: { user: true, conversation: true },
    });

    const joinRequestResponse: JoinRequestResponseDto = {
      joinRequestId: joinRequest.joinRequestId.toString(),
      conversationId: joinRequest.conversationId,
      userId: joinRequest.userId,
      status: joinRequest.status,
      requestedAt: joinRequest.requestedAt,
      respondedAt: joinRequest.respondedAt,
      respondedById: joinRequest.respondedById,
    };

    // Cache join request
    await this.redis.set(
      `joinRequest:${joinRequest.joinRequestId}`,
      joinRequestResponse,
      86400,
    ); // Cache 1 ngày

    // Lấy danh sách admin/moderator để thông báo
    const admins = await this.prisma.participants.findMany({
      where: {
        conversationId,
        role: { in: [ParticipantRole.ADMIN, ParticipantRole.MODERATOR] },
        leftAt: null,
      },
      include: { user: true },
    });

    // Tạo notification cho từng admin/moderator
    const notifications = admins.map((admin) => ({
      userId: admin.userId,
      title: 'New Join Request',
      message: `${user.username} wants to join ${conversation.title || 'the group'}`,
      type: 'GROUP_INVITE' as const,
    }));

    if (notifications.length > 0) {
      await this.prisma.notifications.createMany({
        data: notifications,
      });
    }

    // Thông báo qua WebSocket tới admin/moderator
    this.socketGateway.notifyJoinRequestCreated(
      conversationId,
      joinRequestResponse,
      admins.map((admin) => admin.userId),
    );

    return joinRequestResponse;
  }

  async getJoinRequestsForUser(userId: string): Promise<JoinRequestResponseDto[]> {
    // Lấy danh sách các conversation mà user là admin hoặc moderator
    const userAdminConversations = await this.prisma.participants.findMany({
      where: {
        userId,
        role: { in: [ParticipantRole.ADMIN, ParticipantRole.MODERATOR] },
        leftAt: null,
      },
      select: { conversationId: true },
    });

    if (userAdminConversations.length === 0) {
      return [];
    }

    const conversationIds = userAdminConversations.map(p => p.conversationId);

    // Lấy tất cả join requests của các conversation mà user là admin/moderator
    const joinRequests = await this.prisma.joinRequests.findMany({
      where: {
        conversationId: { in: conversationIds },
        status: RequestStatus.PENDING,
      },
      include: { 
        user: { select: { userId: true, username: true, fullName: true, avatar: true } },
        conversation: { select: { conversationId: true, title: true, groupAvatar: true } }
      },
      orderBy: { requestedAt: 'desc' },
    });

    return joinRequests.map((jr) => ({
      joinRequestId: jr.joinRequestId.toString(),
      conversationId: jr.conversationId,
      userId: jr.userId,
      status: jr.status,
      requestedAt: jr.requestedAt,
      respondedAt: jr.respondedAt,
      respondedById: jr.respondedById,
      // Thêm thông tin bổ sung để frontend hiển thị
      user: {
        username: jr.user.username,
        fullName: jr.user.fullName,
        avatar: jr.user.avatar,
      },
      conversation: {
        title: jr.conversation.title,
        groupAvatar: jr.conversation.groupAvatar,
      },
    }));
  }

  async getJoinRequests(
    conversationId: string,
    userId: string,
  ): Promise<JoinRequestResponseDto[]> {
    // Kiểm tra quyền admin/moderator
    const participant = await this.prisma.participants.findFirst({
      where: {
        conversationId,
        userId,
        role: { in: [ParticipantRole.ADMIN, ParticipantRole.MODERATOR] },
        leftAt: null,
      },
    });
    if (!participant) {
      throw new ForbiddenException(
        'Only admin or moderator can view join requests.',
      );
    }

    // Kiểm tra cache trước
    const cachedRequests = await this.redis.get<JoinRequestResponseDto[]>(
      `conversation:${conversationId}:joinRequests`,
    );
    if (cachedRequests) {
      return cachedRequests;
    }

    const joinRequests = await this.prisma.joinRequests.findMany({
      where: { conversationId, status: RequestStatus.PENDING },
      include: { 
        user: { select: { userId: true, username: true, fullName: true, avatar: true } },
        conversation: { select: { conversationId: true, title: true, groupAvatar: true } }
      },
      orderBy: { requestedAt: 'desc' },
    });

    const joinRequestResponses: JoinRequestResponseDto[] = joinRequests.map(
      (jr) => ({
        joinRequestId: jr.joinRequestId.toString(),
        conversationId: jr.conversationId,
        userId: jr.userId,
        status: jr.status,
        requestedAt: jr.requestedAt,
        respondedAt: jr.respondedAt,
        respondedById: jr.respondedById,
        user: {
          username: jr.user.username,
          fullName: jr.user.fullName,
          avatar: jr.user.avatar,
        },
        conversation: {
          title: jr.conversation.title,
          groupAvatar: jr.conversation.groupAvatar,
        },
      }),
    );

    // Cache lại
    await this.redis.set(
      `conversation:${conversationId}:joinRequests`,
      joinRequestResponses,
      3600,
    );

    return joinRequestResponses;
  }

  async respondJoinRequest(
    userId: string,
    respondJoinRequestDto: RespondJoinRequestDto,
  ): Promise<JoinRequestResponseDto> {
    const { joinRequestId, status } = respondJoinRequestDto;

    const joinRequest = await this.prisma.joinRequests.findUnique({
      where: { joinRequestId: BigInt(joinRequestId) },
      include: { conversation: true, user: true },
    });
    if (!joinRequest) {
      throw new NotFoundException('Join request not found.');
    }

    if (joinRequest.status !== RequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed.');
    }

    // Kiểm tra quyền admin/moderator
    const participant = await this.prisma.participants.findFirst({
      where: {
        conversationId: joinRequest.conversationId,
        userId,
        role: { in: [ParticipantRole.ADMIN, ParticipantRole.MODERATOR] },
        leftAt: null,
      },
    });
    if (!participant) {
      throw new ForbiddenException(
        'Only admin or moderator can respond to join requests.',
      );
    }

    const updatedJoinRequest = await this.prisma.joinRequests.update({
      where: { joinRequestId: BigInt(joinRequestId) },
      data: {
        status,
        respondedById: userId,
        respondedAt: new Date(),
      },
      include: { user: true, conversation: true },
    });

    const joinRequestResponse: JoinRequestResponseDto = {
      joinRequestId: updatedJoinRequest.joinRequestId.toString(),
      conversationId: updatedJoinRequest.conversationId,
      userId: updatedJoinRequest.userId,
      status: updatedJoinRequest.status,
      requestedAt: updatedJoinRequest.requestedAt,
      respondedAt: updatedJoinRequest.respondedAt,
      respondedById: updatedJoinRequest.respondedById,
    };

    // Cập nhật cache
    await this.redis.set(
      `joinRequest:${joinRequestId}`,
      joinRequestResponse,
      86400,
    );
    // Xóa cache danh sách join requests để force refresh
    await this.redis.del(
      `conversation:${joinRequest.conversationId}:joinRequests`,
    );

    // Nếu được duyệt, thêm user vào participant
    if (status === RequestStatus.APPROVED) {
      const newParticipant = await this.prisma.participants.create({
        data: {
          conversationId: joinRequest.conversationId,
          userId: joinRequest.userId,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date(),
        },
        include: { user: true, conversation: true },
      });

      const participantResponse: ParticipantResponseDto = {
        participantId: newParticipant.participantId.toString(),
        conversationId: newParticipant.conversationId,
        userId: newParticipant.userId,
        role: newParticipant.role,
        joinedAt: newParticipant.joinedAt,
        leftAt: newParticipant.leftAt,
        isMuted: newParticipant.isMuted,
        lastReadAt: newParticipant.lastReadAt,
      };

      this.socketGateway.notifyParticipantAdded(
        joinRequest.conversationId,
        participantResponse,
      );

      // Tạo notification cho user được duyệt
      await this.prisma.notifications.create({
        data: {
          userId: joinRequest.userId,
          title: 'Join Request Approved',
          message: `Your request to join ${joinRequest.conversation.title || 'the group'} has been approved`,
          type: 'GROUP_INVITE',
        },
      });
    } else if (status === RequestStatus.REJECTED) {
      // Tạo notification cho user bị từ chối
      await this.prisma.notifications.create({
        data: {
          userId: joinRequest.userId,
          title: 'Join Request Rejected',
          message: `Your request to join ${joinRequest.conversation.title || 'the group'} has been rejected`,
          type: 'GROUP_INVITE',
        },
      });
    }

    // Thông báo qua WebSocket
    this.socketGateway.notifyJoinRequestUpdated(
      joinRequest.conversationId,
      joinRequestResponse,
    );

    return joinRequestResponse;
  }
}