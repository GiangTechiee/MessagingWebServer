import { Module } from '@nestjs/common';
import { ContactsService } from './contact.service';
import { ContactsController } from './contact.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}