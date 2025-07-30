import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '30d'
}));