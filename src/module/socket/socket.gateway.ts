import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { ParticipantResponseDto } from '../participant/dto/participant-response.dto';
import { JoinRequestResponseDto } from '../join-request/dto/join-request-response.dto';
import { MessageResponseDto } from '../message/dto/message-response.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly redis: RedisService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await this.redis.set(`user:${userId}:status`, { isOnline: true, isActive: false }, 3600);
      this.server.emit('userStatus', { userId, isOnline: true, isActive: false });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await this.redis.set(`user:${userId}:status`, { isOnline: false, isActive: false }, 3600);
      this.server.emit('userStatus', { userId, isOnline: false, isActive: false });
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @MessageBody() data: any,
  ) {
    const conversationId = data.conversationId || data;
    if (typeof conversationId !== 'string' || !conversationId) {
      client.emit('error', { message: 'Invalid conversationId' });
      return;
    }
    await client.join(conversationId);
    client.emit('roomJoined', { conversationId });
    console.log(`User joined room: ${conversationId}`);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody()
    data: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    },
  ) {
    const { userId, conversationId, isTyping } = data;
    await this.redis.set(
      `conversation:${conversationId}:typing:${userId}`,
      { isTyping },
      10,
    );
    this.server.to(conversationId).emit('typing', { userId, isTyping });
  }

  // Thêm sự kiện xử lý hoạt động của người dùng
  @SubscribeMessage('userActivity')
  async handleUserActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;
    if (!userId) {
      client.emit('error', { message: 'Invalid userId' });
      return;
    }
    // Cập nhật trạng thái hoạt động trong Redis với TTL ngắn (10 giây)
    await this.redis.set(`user:${userId}:status`, { isOnline: true, isActive: true }, 60);
    this.server.emit('userStatus', { userId, isOnline: true, isActive: true });
    
    // Nếu không có hoạt động tiếp theo, trạng thái sẽ tự động hết hạn và chuyển về isActive: false
    setTimeout(async () => {
      const status = await this.redis.get<{ isOnline: boolean; isActive: boolean }>(`user:${userId}:status`);
      if (!status || !status.isActive) {
        await this.redis.set(`user:${userId}:status`, { isOnline: true, isActive: false }, 3600);
        this.server.emit('userStatus', { userId, isOnline: true, isActive: false });
      }
    }, 10000); // Đồng bộ với TTL của Redis
  }

  notifyNewMessage(conversationId: string, message: MessageResponseDto) {
    this.server.to(conversationId).emit('newMessage', message);
  }

  notifyMessageUpdated(conversationId: string, message: MessageResponseDto) {
    this.server.to(conversationId).emit('messageUpdated', message);
  }

  notifyConversationCreated(conversationId: string, participantIds: string[]) {
    this.server
      .to(participantIds)
      .emit('conversationCreated', { conversationId });
  }

  notifyConversationUpdated(conversationId: string, participantIds: string[]) {
    this.server
      .to(participantIds)
      .emit('conversationUpdated', { conversationId });
  }

  notifyParticipantAdded(
    conversationId: string,
    participant: ParticipantResponseDto,
  ) {
    this.server.to(conversationId).emit('participantAdded', participant);
  }

  notifyParticipantUpdated(
    conversationId: string,
    participant: ParticipantResponseDto,
  ) {
    this.server.to(conversationId).emit('participantUpdated', participant);
  }

  notifyParticipantRemoved(
    conversationId: string,
    removedUserId: string,
    removedByUserId?: string,
    reason: 'left' | 'removed' = 'removed',
  ) {
    const payload = {
      conversationId,
      removedUserId,
      removedByUserId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.server.to(conversationId).emit('participantRemoved', payload);
    this.server.to(removedUserId).emit('participantRemoved', {
      ...payload,
      message:
        reason === 'left'
          ? 'You have left the conversation'
          : 'You have been removed from the conversation',
    });
  }

  notifyJoinRequestCreated(
    conversationId: string,
    joinRequest: JoinRequestResponseDto,
    adminIds: string[],
  ) {
    this.server.to(adminIds).emit('joinRequestCreated', joinRequest);
  }

  notifyJoinRequestUpdated(
    conversationId: string,
    joinRequest: JoinRequestResponseDto,
  ) {
    this.server.to(conversationId).emit('joinRequestUpdated', joinRequest);
  }

  notifyUserStatus(userId: string, isOnline: boolean, isActive: boolean = false) {
    this.server.emit('userStatus', { userId, isOnline, isActive });
  }

  notifyTypingStatus(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ) {
    this.server.to(conversationId).emit('typing', { userId, isTyping });
  }
}