import { RequestStatus } from '@prisma/client';

export class FriendRequestResponseDto {
  friendRequestId: number;
  senderId: string;
  receiverId: string;
  status: RequestStatus;
  requestedAt: Date;
  respondedAt?: Date;
  
  sender?: {
    userId: string;
    username: string;
    fullName: string;
    avatar?: string;
  };
  
  receiver?: {
    userId: string;
    username: string;
    fullName: string;
    avatar?: string;
  };
}