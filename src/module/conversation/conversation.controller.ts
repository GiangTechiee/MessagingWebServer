import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConversationType } from '@prisma/client';

@Controller('conversations')
@UseInterceptors(TransformInterceptor)
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('groupAvatar', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (before resizing)
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Chỉ chấp nhận file ảnh cho avatar nhóm'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async createConversation(
    @GetUser() user: { userId: string },
    @Body() createConversationDto: CreateConversationDto,
    @UploadedFile() groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.createConversation(
      user.userId,
      createConversationDto,
      groupAvatar,
    );
  }

  @Get()
  async getConversations(
    @GetUser() user: { userId: string },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: ConversationType,
  ): Promise<ConversationResponseDto[]> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Số trang phải là số nguyên dương.');
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Giới hạn phải từ 1 đến 100.');
    }
    if (type && !['GROUP', 'DIRECT'].includes(type)) {
      throw new BadRequestException(
        'Loại cuộc trò chuyện phải là GROUP hoặc DIRECT.',
      );
    }

    return this.conversationService.getConversations(
      user.userId,
      pageNum,
      limitNum,
      type,
    );
  }

  @Get(':conversationId')
  async getConversation(
    @GetUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.getConversation(
      conversationId,
      user.userId,
    );
  }

  @Patch(':conversationId')
  @UseInterceptors(
    FileInterceptor('groupAvatar', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (before resizing)
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Chỉ chấp nhận file ảnh cho avatar nhóm'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async updateConversation(
    @GetUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @UploadedFile() groupAvatar?: Express.Multer.File,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.updateConversation(
      conversationId,
      user.userId,
      updateConversationDto,
      groupAvatar,
    );
  }
}
