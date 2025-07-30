import { IsNotEmpty, IsString } from 'class-validator';

export class RespondFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  friendRequestId: string;

  @IsString()
  @IsNotEmpty()
  status: 'APPROVED' | 'REJECTED';
}
