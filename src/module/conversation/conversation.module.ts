import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';
import { ParticipantModule } from '../participant/participant.module';
import { ConversationCacheService } from './conversation-cache.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, RedisModule, SocketModule, ParticipantModule, CloudinaryModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationCacheService],
  exports: [ConversationService, ConversationCacheService],
})
export class ConversationModule {}