import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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
