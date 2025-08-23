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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toUserResponse(user: any): UserResponseDto {
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

  async getUserById(userId: string): Promise<UserResponseDto> {
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
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
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

  async getUsers(page: number = 1, limit: number = 20): Promise<UserResponseDto[]> {
    const skip = (page - 1) * limit;

    const users = await this.prisma.users.findMany({
      where: { isActive: true },
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
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => ({
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullname: user.fullName,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      background: user.background,
    }));
  }

  async searchUsers(query: string, skip: number = 0, limit: number = 20): Promise<UserResponseDto[]> {
    try {
      const trimmedQuery = query.trim().toLowerCase();
      
      // Tìm kiếm theo độ ưu tiên từ cao đến thấp
      const exactMatches = await this.prisma.users.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { username: { equals: trimmedQuery, mode: 'insensitive' } },
                { email: { equals: trimmedQuery, mode: 'insensitive' } },
              ]
            }
          ]
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
        take: limit,
      });

      // Nếu đã đủ kết quả từ exact match
      if (exactMatches.length >= limit) {
        return exactMatches.slice(0, limit).map(user => ({
          ...this.toUserResponse(user),
          matchScore: 100 // Điểm khớp hoàn toàn
        }));
      }

      // Tìm kiếm starts with (bắt đầu bằng)
      const startsWithMatches = await this.prisma.users.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { username: { startsWith: trimmedQuery, mode: 'insensitive' } },
                { email: { startsWith: trimmedQuery, mode: 'insensitive' } },
              ]
            },
            // Loại trừ những kết quả đã có trong exact matches
            {
              NOT: {
                userId: { in: exactMatches.map(u => u.userId) }
              }
            }
          ]
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
        take: limit - exactMatches.length,
      });

      const combinedResults = [...exactMatches, ...startsWithMatches];

      // Nếu vẫn chưa đủ kết quả và query ngắn (tránh quá nhiều kết quả không liên quan)
      if (combinedResults.length < limit && trimmedQuery.length >= 3) {
        const containsMatches = await this.prisma.users.findMany({
          where: {
            AND: [
              { isActive: true },
              {
                OR: [
                  { username: { contains: trimmedQuery, mode: 'insensitive' } },
                  { email: { contains: trimmedQuery, mode: 'insensitive' } },
                ]
              },
              // Loại trừ những kết quả đã có
              {
                NOT: {
                  userId: { in: combinedResults.map(u => u.userId) }
                }
              }
            ]
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
          take: limit - combinedResults.length,
        });

        combinedResults.push(...containsMatches);
      }

      // Sắp xếp theo độ liên quan
      const sortedResults = this.sortByRelevance(combinedResults, trimmedQuery);
      
      return sortedResults.slice(skip, skip + limit).map(user => this.toUserResponse(user));
    } catch (error) {
      console.error('UserService: Lỗi khi tìm kiếm người dùng', {
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException('Không thể tìm kiếm người dùng');
    }
  }

  // Hàm sắp xếp theo độ liên quan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sortByRelevance(users: any[], query: string): any[] {
    return users.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA; // Sắp xếp giảm dần theo điểm
    });
  }

  // Tính điểm độ liên quan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private calculateRelevanceScore(user: any, query: string): number {
    let score = 0;
    const username = user.username?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    const queryLower = query.toLowerCase();

    // Điểm cho exact match
    if (username === queryLower || email === queryLower) {
      score += 100;
    }
    // Điểm cho starts with
    else if (username.startsWith(queryLower) || email.startsWith(queryLower)) {
      score += 80;
    }
    // Điểm cho contains
    else if (username.includes(queryLower) || email.includes(queryLower)) {
      score += 60;
    }

    // Bonus điểm cho username match (ưu tiên username hơn email)
    if (username.includes(queryLower)) {
      score += 10;
    }

    // Penalty cho query quá ngắn so với kết quả
    const lengthRatio = query.length / Math.max(username.length, email.length);
    if (lengthRatio < 0.3) {
      score -= 20;
    }

    return score;
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
