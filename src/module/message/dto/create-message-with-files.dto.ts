import { CreateMessageDto } from './create-message.dto';

export class CreateMessageWithFilesDto extends CreateMessageDto {
  files?: Express.Multer.File[]; // Files từ multer
}