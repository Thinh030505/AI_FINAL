import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResponse {
  url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'ocr-ai/uploads',
  ): Promise<CloudinaryUploadResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
              ),
            );
          }
          if (!result) {
            return reject(new InternalServerErrorException('Cloudinary upload returned empty response'));
          }

          resolve({
            url: result.secure_url || result.url,
            public_id: result.public_id,
            width: result.width || 0,
            height: result.height || 0,
            bytes: result.bytes || file.size,
            format: result.format || file.mimetype.split('/')[1] || 'jpg',
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<any> {
    if (!publicId) return;
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          this.logger.warn(`Failed to delete Cloudinary asset ${publicId}:`, error);
          return resolve(null); // Resolve to allow DB cleanup consistency
        }
        resolve(result);
      });
    });
  }
}
