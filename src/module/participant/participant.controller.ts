import { Controller, Post, Patch, Delete, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantResponseDto, AddParticipantResponseDto } from './dto/participant-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseInterceptors } from '@nestjs/common';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';

@Controller('participants')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor) 
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async addParticipants(@Body() addParticipantDto: AddParticipantDto): Promise<AddParticipantResponseDto> {
    return this.participantService.addParticipants(addParticipantDto);
  }

  @Patch(':conversationId/:userId')
  @UseGuards(JwtAuthGuard)
  async updateParticipant(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ): Promise<ParticipantResponseDto> {
    return this.participantService.updateParticipant(conversationId, userId, updateParticipantDto, req.user.userId);
  }

  @Delete(':conversationId/:userId')
  @UseGuards(JwtAuthGuard)
  async removeParticipant(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.participantService.removeParticipant(conversationId, userId, req.user.userId);
  }

  @Get(':conversationId')
  @UseGuards(JwtAuthGuard)
  async getParticipants(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ): Promise<ParticipantResponseDto[]> {
    return this.participantService.getParticipants(conversationId, req.user.userId);
  }
}