import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactResponse } from './dto/contact-response.dto';
import { ContactListResponse } from './dto/contact-list-response.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto, userId: string): Promise<ContactResponse> {
    const { friendId, isBlocked = false, isFriend = false } = createContactDto;

    // Kiểm tra xem friend có tồn tại không
    const friend = await this.prisma.users.findUnique({
      where: { userId: friendId },
    });
    if (!friend) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Ngăn người dùng tự thêm mình làm liên hệ
    if (friendId === userId) {
      throw new ForbiddenException('Không thể thêm chính bạn làm liên hệ');
    }

    // Kiểm tra xem liên hệ đã tồn tại chưa
    const existingContact = await this.prisma.contacts.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
    if (existingContact) {
      throw new ForbiddenException('Liên hệ đã tồn tại');
    }

    const contact = await this.prisma.contacts.create({
      data: {
        userId,
        friendId,
        isBlocked,
        isFriend,
      },
      include: {
        contact: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            avatar: true,
            background: true,
          },
        },
      },
    });

    return {
      ...contact,
      contactId: contact.contactId.toString(), 
    };
  }

  async findAll(userId: string): Promise<ContactListResponse> {
    const contacts = await this.prisma.contacts.findMany({
      where: { userId },
      include: {
        contact: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            avatar: true,
            background: true, 
          },
        },
      },
    });

    return {
      contacts: contacts.map((contact) => ({
        ...contact,
        contactId: contact.contactId.toString(),
      })),
    };
  }

  async findOne(id: string, userId: string): Promise<ContactResponse> {
    const contact = await this.prisma.contacts.findFirst({
      where: { contactId: BigInt(id), userId },
      include: {
        contact: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            avatar: true,
            background: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Liên hệ không tồn tại');
    }

    return {
      ...contact,
      contactId: contact.contactId.toString(), 
    };
  }

  async update(id: string, updateContactDto: UpdateContactDto, userId: string): Promise<ContactResponse> {
    const contact = await this.prisma.contacts.findFirst({
      where: { contactId: BigInt(id), userId },
    });

    if (!contact) {
      throw new NotFoundException('Liên hệ không tồn tại');
    }

    const updatedContact = await this.prisma.contacts.update({
      where: { contactId: BigInt(id) },
      data: updateContactDto,
      include: {
        contact: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            avatar: true,
            background: true,
          },
        },
      },
    });

    return {
      ...updatedContact,
      contactId: updatedContact.contactId.toString(), 
    };
  }

  async remove(id: string, userId: string) {
    const contact = await this.prisma.contacts.findFirst({
      where: { contactId: BigInt(id), userId },
    });

    if (!contact) {
      throw new NotFoundException('Liên hệ không tồn tại');
    }

    await this.prisma.contacts.delete({
      where: { contactId: BigInt(id) },
    });

    return { message: 'Xóa liên hệ thành công' };
  }
}