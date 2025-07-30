import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  fullname?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  avatar?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  background?: string;
}
