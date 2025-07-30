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
      await this.redis.set(`user:${userId}:status`, { isOnline: true }, 3600);
      this.server.emit('userStatus', { userId, isOnline: true });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await this.redis.set(`user:${userId}:status`, { isOnline: false }, 3600);
      this.server.emit('userStatus', { userId, isOnline: false });
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @MessageBody() data: any,
  ) {
    const conversationId = data.conversationId || data;
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

  // New method to notify about new messages
  notifyNewMessage(conversationId: string, message: MessageResponseDto) {
    this.server.to(conversationId).emit('newMessage', message);
  }

  // New method to notify about updated messages
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

  /**
   * Thông báo khi một participant bị xóa/rời khỏi conversation
   * @param conversationId ID của conversation
   * @param removedUserId ID của user bị xóa/rời
   * @param removedByUserId ID của user thực hiện hành động xóa (optional)
   * @param reason Lý do: 'left' (tự rời) hoặc 'removed' (bị kick)
   */
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

    // Thông báo tới tất cả participants còn lại trong conversation
    this.server.to(conversationId).emit('participantRemoved', payload);

    // Thông báo riêng tới user bị xóa/rời (nếu họ vẫn online)
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

  notifyUserStatus(userId: string, isOnline: boolean) {
    this.server.emit('userStatus', { userId, isOnline });
  }

  notifyTypingStatus(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ) {
    this.server.to(conversationId).emit('typing', { userId, isTyping });
  }
}
