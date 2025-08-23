import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateMessageWithFilesDto } from './dto/create-message-with-files.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';

@Controller('messages')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // Endpoint duy nhất cho cả text và file
  @Post()
  @UseInterceptors(FilesInterceptor('files', 10)) // Tối đa 10 files
  async createMessage(
    @GetUser() user: { userId: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    // Tự động detect có files hay không
    if (files && files.length > 0) {
      // Có files -> xử lý như message với files
      const createMessageWithFilesDto: CreateMessageWithFilesDto = {
        ...createMessageDto,
        files,
      };
      return await this.messageService.createMessageWithFiles(
        user.userId,
        createMessageWithFilesDto,
      );
    } else {
      // Không có files -> xử lý như text message
      return await this.messageService.createMessage(user.userId, createMessageDto);
    }
  }

  @Get('conversation/:conversationId')
  async getMessages(
    @GetUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Query('limit') limit: string = '5',
    @Query('offset') offset: string = '0',
  ): Promise<MessageResponseDto[]> {
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      throw new BadRequestException('Limit and offset must be valid numbers.');
    }

    return await this.messageService.getMessages(
      conversationId,
      user.userId,
      parsedLimit,
      parsedOffset,
    );
  }

  @Patch(':messageId')
  async updateMessage(
    @GetUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    return await this.messageService.updateMessage(
      messageId,
      user.userId,
      updateMessageDto,
    );
  }
}