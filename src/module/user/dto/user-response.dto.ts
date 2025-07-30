import { UserRole } from '@prisma/client';

export class UserResponseDto {
  userId: string;
  username: string;
  email: string;
  fullname: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string | null;
  background?: string | null;
}
