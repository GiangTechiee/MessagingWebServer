import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserRole } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: AuthResponseDto }> {
    const { email, username, password, confirmPassword, fullName } =
      registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.users.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException(
          'Email or username already exists and is verified',
        );
      }

      // Nếu tài khoản chưa xác thực, cập nhật token và thời gian hết hạn
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = uuidv4();
      const verificationTokenExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ); // 24 giờ

      const user = await this.prisma.users.update({
        where: { userId: existingUser.userId },
        data: {
          email,
          username,
          password: hashedPassword,
          fullName,
          verificationToken,
          verificationTokenExpires,
          role: UserRole.USER,
        },
        select: {
          userId: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
        },
      });

      const verificationLink = `${this.configService.get<string>('app.backendUrl')}/auth/verify-email/${verificationToken}`;
      await this.emailService.sendVerificationEmail({
        to: email,
        email,
        verificationLink,
      });

      return {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          accessToken: '',
        },
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.users.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName: fullName,
        verificationToken,
        verificationTokenExpires,
        role: UserRole.USER,
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    const verificationLink = `${this.configService.get<string>('app.backendUrl')}/auth/verify-email/${verificationToken}`;
    await this.emailService.sendVerificationEmail({
      to: email,
      email,
      verificationLink,
    });

    return {
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessToken: '',
      },
    };
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.prisma.sessions.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ refreshToken: string; user: AuthResponseDto }> {
    const { email, password } = loginDto;

    const user = await this.prisma.users.findUnique({
      where: { email, isActive: true },
    });

    if (!user || !user.isVerified) {
      throw new UnauthorizedException(
        'Invalid credentials or email not verified',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid user or password');
    }

    // Xóa các phiên hết hạn trước khi kiểm tra số phiên
    await this.cleanupExpiredSessions();

    // Kiểm tra số lượng phiên đăng nhập còn hoạt động
    // const activeSessions = await this.prisma.sessions.count({
    //   where: {
    //     userId: user.userId,
    //     isRevoked: false,
    //     expiresAt: {
    //       gt: new Date(),
    //     },
    //   },
    // });

    // if (activeSessions >= 5) {
    //   throw new BadRequestException(
    //     'Maximum 5 login sessions reached. Please log out from other devices.',
    //   );
    // }

    const payload: JwtPayload = {
      sub: user.userId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessTokenExpiresIn'),
    });

    const refreshToken = randomBytes(32).toString('hex');
    const hashRefreshToken = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.sessions.create({
      data: {
        userId: user.userId,
        refreshToken: hashRefreshToken,
        expiresAt,
      },
    });

    return {
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessToken,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.users.findUnique({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.users.update({
      where: { email },
      data: {
        resetPasswordOTP: otp,
        resetPasswordExpires: expiresAt,
      },
    });

    await this.emailService.sendResetPasswordEmail({
      to: email,
      email,
      otp,
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { email, newPassword, confirmPassword, otp } = resetPasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.users.findUnique({
      where: { email, resetPasswordOTP: otp, isActive: true },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetPasswordOTP: null,
        resetPasswordExpires: null,
      },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { verificationToken: token, isActive: true },
    });

    if (
      !user ||
      !user.verificationTokenExpires ||
      user.verificationTokenExpires < new Date()
    ) {
      if (
        user &&
        user.verificationTokenExpires &&
        user.verificationTokenExpires < new Date()
      ) {
        // Xóa tài khoản nếu token hết hạn
        await this.prisma.users.delete({
          where: { userId: user.userId },
        });
      }
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.users.update({
      where: { userId: user.userId },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    newRefreshToken: string;
    user: AuthResponseDto;
  }> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const session = await this.prisma.sessions.findUnique({
      where: { refreshToken, isRevoked: false },
      include: { user: true },
    });

    if (!session || !session.user.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    try {
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;
      const newPayload: JwtPayload = {
        sub: payload.sub,
        role: payload.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('jwt.accessTokenExpiresIn'),
      });

      const newRefreshToken = randomBytes(32).toString('hex');
      const newHashRefreshToken = createHash('sha256')
        .update(newRefreshToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.sessions.update({
        where: { sessionId: session.sessionId },
        data: {
          refreshToken: newHashRefreshToken,
          expiresAt,
        },
      });

      return {
        accessToken,
        newRefreshToken,
        user: {
          userId: session.user.userId,
          username: session.user.username,
          email: session.user.email,
          fullName: session.user.fullName,
          role: session.user.role,
          accessToken,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const hashRefreshToken = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.prisma.sessions.deleteMany({
      where: {
        refreshToken: hashRefreshToken,
        isRevoked: false,
      },
    });

    // Dọn dẹp các phiên hết hạn
    await this.cleanupExpiredSessions();
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.sessions.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });
  }

  async getSessionByRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string } | null> {
    const hashRefreshToken = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    return this.prisma.sessions.findUnique({
      where: {
        refreshToken: hashRefreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: { userId: true },
    });
  }
}
