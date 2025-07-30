import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  ConflictException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getUser(@GetUser() user: { userId: string }): Promise<UserResponseDto> {
    try {
      return await this.userService.getUser(user.userId);
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new NotFoundException('User not found');
    }
  }

  @Patch('me')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @GetUser() user: { userId: string },
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      return await this.userService.updateUser(user.userId, updateUserDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('User not found');
    }
  }

  // user.controller.ts
@Post('me/avatar')
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (before resizing)
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(
          new BadRequestException('Only image files are allowed'),
          false,
        );
      }
      cb(null, true);
    },
  }),
)
async uploadAvatar(
  @GetUser() user: { userId: string },
  @UploadedFile() file: Express.Multer.File,
): Promise<UserResponseDto> {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }
  try {
    const result = await this.userService.uploadAvatar(user.userId, file);
    return result;
  } catch (error) {
    console.error('UserController: Lỗi trong uploadAvatar', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

  @Post('me/background')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (before resizing)
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadBackground(
    @GetUser() user: { userId: string },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.userService.uploadBackground(user.userId, file);
  }
}
