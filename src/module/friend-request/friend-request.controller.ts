import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FriendRequestService } from './friend-request.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { RespondFriendRequestDto } from './dto/friend-request-respond.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('friend-requests')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class FriendRequestController {
  constructor(private readonly friendRequestService: FriendRequestService) {}

  @Post('send')
  async sendFriendRequest(
    @GetUser() user: { userId: string },
    @Body() createFriendRequestDto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.friendRequestService.sendFriendRequest(
      user.userId,
      createFriendRequestDto,
    );
  }

  @Post('respond')
  async respondFriendRequest(
    @GetUser() user: { userId: string },
    @Body() respondFriendRequestDto: RespondFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.friendRequestService.respondFriendRequest(
      user.userId,
      respondFriendRequestDto,
    );
  }

  @Get()
  async getFriendRequests(
    @GetUser() user: { userId: string },
  ): Promise<FriendRequestResponseDto[]> {
    return this.friendRequestService.getFriendRequests(user.userId);
  }
}
