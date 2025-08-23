export class AuthResponseDto {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string | null;
  accessToken: string;
}