import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JoinRequestService } from './join-request.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { RespondJoinRequestDto } from './dto/join-request-respond.dto';
import { JoinRequestResponseDto } from './dto/join-request-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { ParticipantResponseDto } from '../participant/dto/participant-response.dto';

@Controller('join-requests')
export class JoinRequestController {
  constructor(private readonly joinRequestService: JoinRequestService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createJoinRequest(
    @GetUser() user: { userId: string },
    @Body() createJoinRequestDto: CreateJoinRequestDto,
  ): Promise<JoinRequestResponseDto | { message: string; participant: ParticipantResponseDto }> {
    return this.joinRequestService.createJoinRequest(
      createJoinRequestDto,
      user.userId,
    );
  }

  /**
   * Lấy tất cả join requests của các nhóm mà user hiện tại là admin hoặc moderator
   */
  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyJoinRequests(
    @GetUser() user: { userId: string },
  ): Promise<JoinRequestResponseDto[]> {
    return this.joinRequestService.getJoinRequestsForUser(user.userId);
  }

  /**
   * Lấy join requests của một conversation cụ thể (chỉ admin/moderator của nhóm đó mới xem được)
   */
  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getJoinRequestsByConversation(
    @GetUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
  ): Promise<JoinRequestResponseDto[]> {
    return this.joinRequestService.getJoinRequests(conversationId, user.userId);
  }

  @Post('respond')
  @UseGuards(JwtAuthGuard)
  async respondJoinRequest(
    @GetUser() user: { userId: string },
    @Body() respondJoinRequestDto: RespondJoinRequestDto,
  ): Promise<JoinRequestResponseDto> {
    return this.joinRequestService.respondJoinRequest(
      user.userId,
      respondJoinRequestDto,
    );
  }
}