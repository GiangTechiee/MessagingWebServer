import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        background: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullname: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      background: user.background,
    };
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    if (updateUserDto.username) {
      const existingUser = await this.prisma.users.findUnique({
        where: { username: updateUserDto.username },
      });
      if (existingUser && existingUser.userId !== userId) {
        throw new ConflictException(
          `Username ${updateUserDto.username} is already taken`,
        );
      }
    }

    const user = await this.prisma.users.update({
      where: { userId },
      data: {
        username: updateUserDto.username,
        fullName: updateUserDto.fullname,
        avatar: updateUserDto.avatar,
        background: updateUserDto.background,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        background: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullname: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      background: user.background,
    };
  }

  private async resizeImageIfNeeded(
  file: Express.Multer.File,
): Promise<Buffer> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size <= MAX_SIZE) {
    return file.buffer;
  }

  try {
    const resizedBuffer = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return resizedBuffer;
  } catch (error) {
    console.error('UserService: Lỗi khi resize ảnh với sharp', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

  private async deleteOldFile(url: string | null): Promise<void> {
  if (!url) {
    return;
  }

  const publicId = url.split('/').slice(-2).join('/').split('.')[0];
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('UserService: Lỗi khi xóa file cũ trên Cloudinary', {
      publicId,
      error: error.message,
      stack: error.stack,
    });
    // Continue even if deletion fails
  }
}

  async uploadAvatar(
  userId: string,
  file: Express.Multer.File,
): Promise<UserResponseDto> {

  // Validate file type
  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestException('Only image files are allowed for avatar');
  }

  // Resize image if needed
  let processedBuffer;
  try {
    processedBuffer = await this.resizeImageIfNeeded(file);
  } catch (error) {
    console.error('UserService: Lỗi khi resize ảnh', {
      error: error.message,
      stack: error.stack,
    });
    throw new InternalServerErrorException('Failed to process image');
  }

  // Get current user to check for old avatar
  const currentUser = await this.prisma.users.findUnique({
    where: { userId },
    select: { avatar: true },
  });

  if (!currentUser) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  // Delete old avatar if exists
  try {
    await this.deleteOldFile(currentUser.avatar);
  } catch (error) {
    console.error('UserService: Lỗi khi xóa avatar cũ', {
      error: error.message,
      stack: error.stack,
    });
    // Continue even if deletion fails
  }

  // Upload new avatar to Cloudinary
  let result;
  try {
    result = await this.cloudinaryService.uploadFile(
      { ...file, buffer: processedBuffer },
      'image',
      'avatars',
    );
  } catch (error) {
    console.error('UserService: Lỗi khi upload avatar lên Cloudinary', {
      error: error.message,
      stack: error.stack,
    });
    throw new InternalServerErrorException('Failed to upload avatar to Cloudinary');
  }

  // Update user avatar
  try {
    const user = await this.prisma.users.update({
      where: { userId },
      data: {
        avatar: result.secure_url,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        background: true,
      },
    });
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullname: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      background: user.background,
    };
  } catch (error) {
    console.error('UserService: Lỗi khi cập nhật avatar trong database', {
      error: error.message,
      stack: error.stack,
    });
    throw new InternalServerErrorException('Failed to update avatar in database');
  }
}

  async uploadBackground(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Only image files are allowed for background',
      );
    }

    // Resize image if needed
    const processedBuffer = await this.resizeImageIfNeeded(file);

    // Get current user to check for old background
    const currentUser = await this.prisma.users.findUnique({
      where: { userId },
      select: { background: true },
    });

    if (!currentUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old background if exists
    await this.deleteOldFile(currentUser.background);

    // Upload new background to Cloudinary
    const result = await this.cloudinaryService.uploadFile(
      { ...file, buffer: processedBuffer },
      'image',
      'backgrounds',
    );

    // Update user background
    const user = await this.prisma.users.update({
      where: { userId },
      data: {
        background: result.secure_url,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        background: true,
      },
    });

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullname: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      background: user.background,
    };
  }
}
