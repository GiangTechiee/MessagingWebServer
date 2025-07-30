import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`,
}));