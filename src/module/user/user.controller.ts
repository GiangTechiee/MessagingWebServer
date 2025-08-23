import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  ConflictException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  InternalServerErrorException
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

  @Get()
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<UserResponseDto[]> {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        throw new BadRequestException('Page must be a positive integer');
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return await this.userService.getUsers(pageNum, limitNum);
    } catch (error) {
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to fetch users');
    }
  }

  @Get('search')
  async searchUsers(
    @Query('query') query: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '20',
  ): Promise<UserResponseDto[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Query parameter is required');
      }

      // Kiểm tra độ dài query tối thiểu để tránh quá nhiều kết quả
      if (query.trim().length < 2) {
        throw new BadRequestException('Query must be at least 2 characters long');
      }

      const skipNum = parseInt(skip, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Skip must be a non-negative integer');
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) { // Giảm limit tối đa xuống 50
        throw new BadRequestException('Limit must be between 1 and 50');
      }

      return await this.userService.searchUsers(query.trim(), skipNum, limitNum);
    } catch (error) {
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to search users');
    }
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string): Promise<UserResponseDto> {
    try {
      return await this.userService.getUserById(userId);
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new NotFoundException('Người dùng không tồn tại');
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
