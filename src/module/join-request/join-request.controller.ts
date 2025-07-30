import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JoinRequestService } from './join-request.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { RespondJoinRequestDto } from './dto/join-request-respond.dto';
import { JoinRequestResponseDto } from './dto/join-request-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('join-requests')
export class JoinRequestController {
  constructor(private readonly joinRequestService: JoinRequestService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createJoinRequest(
    @GetUser() user: { userId: string },
    @Body() createJoinRequestDto: CreateJoinRequestDto,
  ): Promise<JoinRequestResponseDto> {
    return this.joinRequestService.createJoinRequest(
      createJoinRequestDto,
      user.userId,
    );
  }

  @Get(':conversationId')
  @UseGuards(JwtAuthGuard)
  async getJoinRequests(
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
