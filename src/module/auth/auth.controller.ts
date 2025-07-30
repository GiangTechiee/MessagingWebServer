import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  Get,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Response, Request } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';

@Controller('auth')
@UseInterceptors(TransformInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      message: 'Registration successful. Please verify your email.',
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, user } = await this.authService.login(loginDto);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Login successful',
      user,
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    return {
      message: 'Password reset OTP sent to your email',
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      message: 'Password reset successful',
    };
  }

  @Public()
  @Get('verify-email/:token')
  async verifyEmail(@Req() req: Request) {
    const token = req.params.token;
    await this.authService.verifyEmail(token);
    return {
      message: 'Email verified successfully',
    };
  }

  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    const { accessToken, newRefreshToken, user } =
      await this.authService.refreshToken(refreshToken);

    // Update refresh token in cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Token refreshed successfully',
      accessToken,
      user,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'];
    await this.authService.logout(refreshToken);
    res.clearCookie('refreshToken');
    return {
      message: 'Logout successful',
    };
  }

  @Post('logout-all')
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    const session =
      await this.authService.getSessionByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authService.logoutAll(session.userId);
    res.clearCookie('refreshToken');
    return {
      message: 'Logged out from all devices successfully',
    };
  }
}
