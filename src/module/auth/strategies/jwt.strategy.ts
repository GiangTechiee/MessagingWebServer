import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common/exceptions';

// Interfaces
export interface JwtPayload {
  sub: string; // userId 
  role?: UserRole;
  iat?: number; // issued at
  exp?: number; // expiration
}

export interface ValidatedUser {
  userId: string; 
  email: string;
  role: UserRole;
  username?: string;
  fullName?: string;
  avatar?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: ValidatedUser;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    const jwtSecret = config.get<string>('jwt.secret');
    if (!jwtSecret) {
      throw new Error('JWT secret is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { 
          userId: payload.sub, 
          isActive: true // Chỉ lấy user đang active
        },
        select: { 
          userId: true, 
          email: true, 
          role: true,
          username: true,
          fullName: true,
          avatar: true,
          isVerified: true
        },
      });
      
      if (!user) {
        throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị vô hiệu hóa');
      }

      // Có thể thêm kiểm tra email verified nếu cần
      if (!user.isVerified) {
        throw new UnauthorizedException('Email chưa được xác thực');
      }
      
      return {
        userId: user.userId,
        email: user.email,
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Lỗi xác thực: ' + error.message);
    }
  }
}