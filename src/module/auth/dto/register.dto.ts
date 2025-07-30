import { IsString, IsNotEmpty, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  confirmPassword: string;
}