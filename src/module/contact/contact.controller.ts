import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ContactsService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactResponse } from './dto/contact-response.dto';
import { ContactListResponse } from './dto/contact-list-response.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { Users } from '@prisma/client';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(
    @Body() createContactDto: CreateContactDto,
    @GetUser() user: Users,
  ): Promise<ContactResponse> {
    return this.contactsService.create(createContactDto, user.userId);
  }

  @Get()
  async findAll(@GetUser() user: Users): Promise<ContactListResponse> {
    return this.contactsService.findAll(user.userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser() user: Users,
  ): Promise<ContactResponse> {
    return this.contactsService.findOne(id, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @GetUser() user: Users,
  ): Promise<ContactResponse> {
    return this.contactsService.update(id, updateContactDto, user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUser() user: Users) {
    return this.contactsService.remove(id, user.userId);
  }
}