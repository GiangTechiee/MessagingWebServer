import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  confirmPassword: string;
}