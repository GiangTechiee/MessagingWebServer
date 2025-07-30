import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [RedisModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}