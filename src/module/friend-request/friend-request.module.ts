import { Module } from '@nestjs/common';
import { FriendRequestService } from './friend-request.service';
import { FriendRequestController } from './friend-request.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FriendRequestService],
  controllers: [FriendRequestController],
})
export class FriendRequestModule {}
