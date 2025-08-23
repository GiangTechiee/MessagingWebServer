import { Module } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { ConversationController } from './conversation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';
import { ParticipantModule } from '../participant/participant.module';
import { ConversationCacheService } from './services/conversation-cache.service';
import { ConversationQueryService } from './services/conversation-query.service';
import { ConversationManagementService } from './services/conversation-management.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SocketModule,
    ParticipantModule,
    CloudinaryModule,
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ConversationCacheService,
    ConversationQueryService,
    ConversationManagementService,
  ],
  exports: [
    ConversationService, 
    ConversationCacheService,
    ConversationQueryService,
    ConversationManagementService,
  ],
})
export class ConversationModule {}