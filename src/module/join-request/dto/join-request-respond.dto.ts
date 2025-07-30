import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export class RespondJoinRequestDto {
  @IsString()
  @IsNotEmpty()
  joinRequestId: string;

  @IsEnum(['APPROVED', 'REJECTED'], {
    message: 'Status must be either APPROVED or REJECTED'
  })
  status: 'APPROVED' | 'REJECTED';
}