import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
  cloudinary.config({
    cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
    api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
    api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
  });
}

  async uploadFile(
  file: Express.Multer.File,
  fileType: 'image' | 'video' | 'raw',
  folder: string = 'uploads',
): Promise<UploadApiResponse> {

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: fileType,
        folder,
        allowed_formats: [
          'jpg',
          'png',
          'avif',
          'gif',
          'webp',
          'mp4',
          'webm',
          'mov',
          'avi',
          'flv',
          'mp3',
          'ogg',
          'wav',
          'pdf',
          'docx',
          'zip',
        ],
      },
      (error, result) => {
        if (error || !result) {
          console.error('CloudinaryService: Lỗi khi upload file', {
            error: error?.message || 'No result returned',
            stack: error?.stack,
          });
          return reject(
            error || new InternalServerErrorException('Upload failed'),
          );
        }
        console.log('CloudinaryService: Upload file thành công', {
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
        resolve(result);
      },
    );

    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}
}
