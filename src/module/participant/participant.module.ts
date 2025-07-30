import { Module } from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { ParticipantController } from './participant.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [PrismaModule, RedisModule, SocketModule],
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService],
})
export class ParticipantModule {}