import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateMessageWithFilesDto } from './dto/create-message-with-files.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationCacheService } from '../conversation/conversation-cache.service';
import { MessageType, FileType } from '@prisma/client';

@Injectable()
export class MessageService {
  // Giới hạn dung lượng theo gói miễn phí Cloudinary (10MB)
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB cho video
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB cho image
  private readonly MAX_TOTAL_FILES_SIZE = 25 * 1024 * 1024; // 25MB tổng cho tất cả files

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
    private readonly cacheService: ConversationCacheService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createMessageResponse(message: any, attachments?: any[]): MessageResponseDto {
    return {
      messageId: message.messageId.toString(),
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      replyToMessageId: message.replyToMessageId
        ? message.replyToMessageId.toString()
        : undefined,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      attachments: attachments
      ? attachments.map(attachment => ({
          attachmentId: attachment.attachmentId.toString(), 
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          size: attachment.size,
          fileType: attachment.fileType,
          thumbnailUrl: attachment.thumbnailUrl,
          createdAt: attachment.createdAt,
        }))
      : [],
    };
  }

  private validateFileSize(files: Express.Multer.File[]): void {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize > this.MAX_TOTAL_FILES_SIZE) {
      throw new BadRequestException(
        `Total files size exceeds limit of ${this.MAX_TOTAL_FILES_SIZE / (1024 * 1024)}MB`
      );
    }

    files.forEach((file) => {
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File ${file.originalname} exceeds size limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
        );
      }

      // Kiểm tra riêng cho video và image
      if (file.mimetype.startsWith('video/') && file.size > this.MAX_VIDEO_SIZE) {
        throw new BadRequestException(
          `Video ${file.originalname} exceeds size limit of ${this.MAX_VIDEO_SIZE / (1024 * 1024)}MB`
        );
      }

      if (file.mimetype.startsWith('image/') && file.size > this.MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `Image ${file.originalname} exceeds size limit of ${this.MAX_IMAGE_SIZE / (1024 * 1024)}MB`
        );
      }
    });
  }

  private determineMessageType(content?: string, files?: Express.Multer.File[]): MessageType {
    // Nếu có files thì là FILE message
    if (files && files.length > 0) {
      return MessageType.FILE;
    }
    
    // Nếu chỉ có text thì là TEXT message
    if (content && content.trim()) {
      return MessageType.TEXT;
    }
    
    throw new BadRequestException('Message must contain either text content or files');
  }

  private mapMimeTypeToFileType(mimeType: string): FileType {
    switch (true) {
      case mimeType.startsWith('image/'):
        return FileType.IMAGE;
      case mimeType.startsWith('video/'):
        return FileType.VIDEO;
      case mimeType.startsWith('audio/'):
        return FileType.AUDIO;
      case mimeType === 'application/pdf':
        return FileType.PDF;
      case mimeType.includes('word') || mimeType.includes('document'):
        return FileType.DOCUMENT;
      default:
        return FileType.OTHER;
    }
  }

  private getCloudinaryConfig(mimeType: string): { resourceType: 'image' | 'video' | 'raw', folder: string } {
    switch (true) {
      case mimeType.startsWith('image/'):
        return { resourceType: 'image', folder: 'images' };
      case mimeType.startsWith('video/'):
        return { resourceType: 'video', folder: 'videos' };
      case mimeType.startsWith('audio/'):
        return { resourceType: 'video', folder: 'audio' }; // Audio treated as video in Cloudinary
      default:
        return { resourceType: 'raw', folder: 'documents' };
    }
  }

  async createMessage(
    userId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const { conversationId, content, messageType, replyToMessageId } = createMessageDto;

    // Validate participant
    const participant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    // Validate conversation
    const conversation = await this.prisma.conversations.findUnique({
      where: { conversationId, isActive: true },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found or inactive.');
    }

    // Validate replyToMessageId if provided
    if (replyToMessageId) {
      const replyMessage = await this.prisma.messages.findUnique({
        where: { messageId: BigInt(replyToMessageId) },
      });
      if (!replyMessage || replyMessage.conversationId !== conversationId) {
        throw new BadRequestException('Invalid reply message ID.');
      }
    }

    // Determine message type
    const finalMessageType = messageType || this.determineMessageType(content);

    // Create message
    const message = await this.prisma.messages.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        messageType: finalMessageType,
        replyToMessageId: replyToMessageId ? BigInt(replyToMessageId) : undefined,
        isDeleted: false,
        createdAt: new Date(),
      },
    });

    const messageResponse = this.createMessageResponse(message);

    // Cache recent messages
    await this.cacheService.cacheRecentMessages(conversationId, [messageResponse]);

    // Notify participants via WebSocket
    this.socketGateway.notifyNewMessage(conversationId, messageResponse);

    return messageResponse;
  }

  async createMessageWithFiles(
    userId: string,
    createMessageWithFilesDto: CreateMessageWithFilesDto,
  ): Promise<MessageResponseDto> {
    const { conversationId, content, replyToMessageId, files } = createMessageWithFilesDto;

    // Validate có ít nhất content hoặc files
    if (!content?.trim() && (!files || files.length === 0)) {
      throw new BadRequestException('Message must contain either text content or files');
    }

    // Validate file sizes if files exist
    if (files && files.length > 0) {
      this.validateFileSize(files);
    }

    // Validate participant
    const participant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    // Validate conversation
    const conversation = await this.prisma.conversations.findUnique({
      where: { conversationId, isActive: true },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found or inactive.');
    }

    // Validate replyToMessageId if provided
    if (replyToMessageId) {
      const replyMessage = await this.prisma.messages.findUnique({
        where: { messageId: BigInt(replyToMessageId) },
      });
      if (!replyMessage || replyMessage.conversationId !== conversationId) {
        throw new BadRequestException('Invalid reply message ID.');
      }
    }

    // Determine message type
    const messageType = this.determineMessageType(content, files);

    // Create message first
    const message = await this.prisma.messages.create({
      data: {
        conversationId,
        senderId: userId,
        content: content || null,
        messageType,
        replyToMessageId: replyToMessageId ? BigInt(replyToMessageId) : undefined,
        isDeleted: false,
        createdAt: new Date(),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attachments: any[] = [];

    // Upload files to Cloudinary and create attachments if files exist
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const { resourceType, folder } = this.getCloudinaryConfig(file.mimetype);
        
        try {
          const uploadResult = await this.cloudinaryService.uploadFile(
            file,
            resourceType,
            folder,
          );

          return await this.prisma.attachments.create({
            data: {
              messageId: message.messageId,
              fileName: file.originalname,
              fileUrl: uploadResult.secure_url,
              size: file.size,
              fileType: this.mapMimeTypeToFileType(file.mimetype),
              thumbnailUrl: uploadResult.eager?.[0]?.secure_url || null,
            },
          });
        } catch (error) {
          console.error(`Failed to upload file ${file.originalname}:`, error);
          throw new BadRequestException(`Failed to upload file: ${file.originalname}`);
        }
      });

      try {
        attachments = await Promise.all(uploadPromises);
      } catch (error) {
        // Rollback: delete the created message if file upload fails
        await this.prisma.messages.delete({
          where: { messageId: message.messageId },
        });
        throw error;
      }
    }

    const messageResponse = this.createMessageResponse(message, attachments);

    // Cache recent messages
    await this.cacheService.cacheRecentMessages(conversationId, [messageResponse]);

    // Notify participants via WebSocket
    this.socketGateway.notifyNewMessage(conversationId, messageResponse);

    return messageResponse;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<MessageResponseDto[]> {
    // Validate participant
    const participant = await this.prisma.participants.findFirst({
      where: { conversationId, userId, leftAt: null },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    // Check cached messages first
    const cachedMessages = await this.cacheService.getRecentMessages(conversationId);
    if (cachedMessages.length >= limit) {
      return cachedMessages.slice(offset, offset + limit);
    }

    // Fetch messages from database with attachments
    const messages = await this.prisma.messages.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sender: { select: { userId: true, username: true, avatar: true } },
        attachments: true,
      },
    });

    const messageResponses = messages.map((message) =>
      this.createMessageResponse(message, message.attachments),
    );

    // Cache fetched messages
    if (messageResponses.length > 0) {
      await this.cacheService.cacheRecentMessages(conversationId, messageResponses);
    }

    return messageResponses;
  }

  async updateMessage(
    messageId: string,
    userId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    // Find message
    const message = await this.prisma.messages.findUnique({
      where: { messageId: BigInt(messageId) },
      include: { 
        conversation: true,
        attachments: true,
      },
    });

    if (!message) {
      throw new BadRequestException('Message not found.');
    }

    // Validate sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only update your own messages.');
    }

    // Validate conversation
    if (!message.conversation.isActive) {
      throw new BadRequestException(
        'Cannot update message in inactive conversation.',
      );
    }

    // Update message
    const updatedMessage = await this.prisma.messages.update({
      where: { messageId: BigInt(messageId) },
      data: {
        content: updateMessageDto.content,
        isDeleted: updateMessageDto.isDeleted,
        updatedAt: new Date(),
      },
    });

    const messageResponse = this.createMessageResponse(updatedMessage, message.attachments);

    // Cache updated message
    await this.cacheService.cacheRecentMessages(message.conversationId, [messageResponse]);

    // Notify participants via WebSocket
    this.socketGateway.notifyMessageUpdated(message.conversationId, messageResponse);

    return messageResponse;
  }
}