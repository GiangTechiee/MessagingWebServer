import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { RespondFriendRequestDto } from './dto/friend-request-respond.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';

@Injectable()
export class FriendRequestService {
  constructor(private prisma: PrismaService) {}

  // Helper method to transform Prisma object to DTO (similar to createMessageResponse)
  private createFriendRequestResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    friendRequest: any,
  ): FriendRequestResponseDto {
    return {
      friendRequestId: Number(friendRequest.friendRequestId), // Convert BigInt to Number
      senderId: friendRequest.senderId,
      receiverId: friendRequest.receiverId,
      status: friendRequest.status,
      requestedAt: friendRequest.requestedAt,
      respondedAt: friendRequest.respondedAt,
      sender: friendRequest.sender
        ? {
            userId: friendRequest.sender.userId,
            username: friendRequest.sender.username,
            fullName: friendRequest.sender.fullName,
            avatar: friendRequest.sender.avatar,
          }
        : undefined,
      receiver: friendRequest.receiver
        ? {
            userId: friendRequest.receiver.userId,
            username: friendRequest.receiver.username,
            fullName: friendRequest.receiver.fullName,
            avatar: friendRequest.receiver.avatar,
          }
        : undefined,
    };
  }

  // Helper method to transform array of friend requests
  private createFriendRequestArrayResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    friendRequests: any[],
  ): FriendRequestResponseDto[] {
    return friendRequests.map((request) =>
      this.createFriendRequestResponse(request),
    );
  }

  async sendFriendRequest(
    senderId: string,
    createFriendRequestDto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    const { receiverId } = createFriendRequestDto;

    // Check if users exist
    const sender = await this.prisma.users.findUnique({
      where: { userId: senderId },
    });
    const receiver = await this.prisma.users.findUnique({
      where: { userId: receiverId },
    });

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if request already exists
    const existingRequest = await this.prisma.friendRequests.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new BadRequestException('Friend request already sent');
    }

    // Check if already friends
    const existingContact = await this.prisma.contacts.findUnique({
      where: { userId_friendId: { userId: senderId, friendId: receiverId } },
    });

    if (existingContact && existingContact.isFriend) {
      throw new BadRequestException('Users are already friends');
    }

    // Create friend request
    const friendRequest = await this.prisma.friendRequests.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
      include: { sender: true, receiver: true },
    });

    // Create notification for receiver
    await this.prisma.notifications.create({
      data: {
        userId: receiverId,
        title: 'New Friend Request',
        message: `You received a friend request from ${sender.username}`,
        type: 'FRIEND_REQUEST',
      },
    });

    return this.createFriendRequestResponse(friendRequest);
  }

  async respondFriendRequest(
    userId: string,
    respondFriendRequestDto: RespondFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    const { friendRequestId, status } = respondFriendRequestDto;

    // Find the friend request
    const friendRequest = await this.prisma.friendRequests.findUnique({
      where: { friendRequestId: BigInt(friendRequestId) },
      include: { sender: true, receiver: true },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendRequest.receiverId !== userId) {
      throw new BadRequestException(
        'You are not authorized to respond to this request',
      );
    }

    if (friendRequest.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    // Update friend request status
    const updatedFriendRequest = await this.prisma.friendRequests.update({
      where: { friendRequestId: BigInt(friendRequestId) },
      data: {
        status,
        respondedAt: new Date(),
      },
    });

    // Handle contact updates based on response
    if (status === 'APPROVED') {
      // Add both users to each other's contact list with isFriend: true
      await this.prisma.contacts.createMany({
        data: [
          {
            userId: friendRequest.senderId,
            friendId: friendRequest.receiverId,
            isFriend: true,
          },
          {
            userId: friendRequest.receiverId,
            friendId: friendRequest.senderId,
            isFriend: true,
          },
        ],
        skipDuplicates: true,
      });

      // Create notification for sender
      await this.prisma.notifications.create({
        data: {
          userId: friendRequest.senderId,
          title: 'Friend Request Accepted',
          message: `${friendRequest.receiver.username} accepted your friend request`,
          type: 'FRIEND_REQUEST',
        },
      });
    } else if (status === 'REJECTED') {
      // Add receiver to sender's contact list with isFriend: false
      await this.prisma.contacts.create({
        data: {
          userId: friendRequest.senderId,
          friendId: friendRequest.receiverId,
          isFriend: false,
        },
      });

      // Create notification for sender
      await this.prisma.notifications.create({
        data: {
          userId: friendRequest.senderId,
          title: 'Friend Request Rejected',
          message: `${friendRequest.receiver.username} rejected your friend request`,
          type: 'FRIEND_REQUEST',
        },
      });
    }

    return this.createFriendRequestResponse(updatedFriendRequest);
  }

  async getFriendRequests(userId: string): Promise<FriendRequestResponseDto[]> {
    const friendRequests = await this.prisma.friendRequests.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: { sender: true, receiver: true },
      orderBy: { requestedAt: 'desc' },
    });

    return this.createFriendRequestArrayResponse(friendRequests);
  }
}
