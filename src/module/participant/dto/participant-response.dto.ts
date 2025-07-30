import { ParticipantRole } from '@prisma/client';

export class ParticipantResponseDto {
  participantId: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date | null;
  isMuted: boolean;
  lastReadAt?: Date | null;
}

export class AddParticipantResponseDto {
  success: ParticipantResponseDto[];
  failed: {
    userId: string;
    role: ParticipantRole;
    error: string;
  }[];
  total: number;
  successCount: number;
  failedCount: number;
}