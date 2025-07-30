import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { FileType } from '@prisma/client';

@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let resourceType: 'image' | 'video' | 'raw';
    let folder: string;

    // Map FileType to Cloudinary resource_type
    switch (file.mimetype) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        resourceType = 'image';
        folder = 'images';
        break;
      case 'video/mp4':
      case 'video/webm':
      case 'video/mov':
      case 'video/avi':
        resourceType = 'video';
        folder = 'videos';
        break;
      case 'audio/mpeg':
      case 'audio/ogg':
      case 'audio/wav':
        resourceType = 'video'; // Audio files are treated as video in Cloudinary
        folder = 'audio';
        break;
      case 'application/pdf':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        resourceType = 'raw';
        folder = 'documents';
        break;
      default:
        resourceType = 'raw';
        folder = 'others';
        break;
    }

    const result = await this.cloudinaryService.uploadFile(
      file,
      resourceType,
      folder,
    );
    if (!result || !result.secure_url) {
      throw new BadRequestException('File upload failed');
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileType: this.mapMimeTypeToFileType(file.mimetype),
    };
  }

  private mapMimeTypeToFileType(mimeType: string): FileType {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        return FileType.IMAGE;
      case 'video/mp4':
      case 'video/webm':
      case 'video/mov':
      case 'video/avi':
        return FileType.VIDEO;
      case 'audio/mpeg':
      case 'audio/ogg':
      case 'audio/wav':
        return FileType.AUDIO;
      case 'application/pdf':
        return FileType.PDF;
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return FileType.DOCUMENT;
      default:
        return FileType.OTHER;
    }
  }
}
