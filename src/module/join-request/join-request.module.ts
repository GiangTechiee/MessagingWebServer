import { Module } from '@nestjs/common';
import { JoinRequestService } from './join-request.service';
import { JoinRequestController } from './join-request.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [PrismaModule, RedisModule, SocketModule],
  controllers: [JoinRequestController],
  providers: [JoinRequestService],
  exports: [JoinRequestService],
})
export class JoinRequestModule {}
