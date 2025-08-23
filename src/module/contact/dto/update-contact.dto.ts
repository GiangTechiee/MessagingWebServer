import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isFriend?: boolean;
}