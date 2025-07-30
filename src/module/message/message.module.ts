import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { ConversationModule } from '../conversation/conversation.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, SocketModule, ConversationModule, CloudinaryModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}