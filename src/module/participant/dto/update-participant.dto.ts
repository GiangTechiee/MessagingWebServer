import { IsEnum, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantRole } from '@prisma/client';

export class UpdateParticipantDto {
  @IsEnum(ParticipantRole, { message: 'Role phải là ADMIN, MODERATOR hoặc MEMBER' })
  @IsOptional()
  role?: ParticipantRole;

  @IsBoolean({ message: 'isMuted phải là true hoặc false' })
  @IsOptional()
  isMuted?: boolean;

  @IsDate({ message: 'lastReadAt phải là ngày tháng hợp lệ' })
  @Type(() => Date)
  @IsOptional()
  lastReadAt?: Date;

  @IsDate({ message: 'leftAt phải là ngày tháng hợp lệ' })
  @Type(() => Date)
  @IsOptional()
  leftAt?: Date;
}