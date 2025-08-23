import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('notifications')
@UseInterceptors(TransformInterceptor)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createNotificationDto: CreateNotificationDto,
    @GetUser() user: { userId: string },
  ) {
    return this.notificationService.create(createNotificationDto, user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@GetUser() user: { userId: string }, @Query('isRead') isRead?: string) {
    const isReadBool = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.notificationService.findAll(user.userId, isReadBool);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @GetUser() user: { userId: string }) {
    return this.notificationService.findOne(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @GetUser() user: { userId: string },
  ) {
    return this.notificationService.update(id, updateNotificationDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @GetUser() user: { userId: string }) {
    return this.notificationService.remove(id, user.userId);
  }
}