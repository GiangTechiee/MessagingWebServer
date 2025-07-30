import { RequestStatus } from "@prisma/client";

export class JoinRequestResponseDto {
  joinRequestId: string;

  conversationId: string;

  userId: string;

  status: RequestStatus;

  requestedAt: Date;

  respondedAt?: Date | null;

  respondedById?: string | null;
}