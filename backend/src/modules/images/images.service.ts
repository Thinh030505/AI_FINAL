import {
  Injectable,
  Logger,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Image, ImageDocument } from './schemas/image.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

export interface SanitizedImage {
  id: string;
  imageUrl: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  source?: string;
  capturedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  constructor(
    @InjectModel(Image.name) private readonly imageModel: Model<ImageDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException(
        `Unsupported image type ${file.mimetype}. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    const maxMb = this.configService.get<number>('maxImageSizeMb') || 10;
    const maxSizeBytes = maxMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new PayloadTooLargeException(
        `File size exceeds maximum allowed limit of ${maxMb}MB`,
      );
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    source?: string,
    capturedAt?: string,
  ): Promise<SanitizedImage> {
    this.validateImageFile(file);

    let cloudinaryResult;
    try {
      cloudinaryResult = await this.cloudinaryService.uploadImage(file, 'ocr-ai/uploads');
    } catch (err: any) {
      this.logger.error('Failed to upload image to Cloudinary', err);
      throw err;
    }

    try {
      const createdImage = new this.imageModel({
        userId: new Types.ObjectId(userId),
        imageUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        source: source || 'upload',
        capturedAt: capturedAt ? new Date(capturedAt) : undefined,
      });

      const savedImage = await createdImage.save();
      return this.sanitizeImage(savedImage);
    } catch (dbError) {
      this.logger.error(
        `MongoDB save failed for image ${cloudinaryResult.public_id}. Triggering Cloudinary cleanup.`,
        dbError,
      );
      // Clean up orphaned Cloudinary asset
      await this.cloudinaryService.deleteImage(cloudinaryResult.public_id);
      throw new BadRequestException('Failed to save image metadata to database');
    }
  }

  async getUserImages(userId: string): Promise<SanitizedImage[]> {
    const images = await this.imageModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return images.map((img) => this.sanitizeImage(img));
  }

  async getImageById(imageId: string, userId: string): Promise<SanitizedImage> {
    if (!Types.ObjectId.isValid(imageId)) {
      throw new BadRequestException('Invalid image ID format');
    }

    const image = await this.imageModel.findById(imageId).exec();
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this image resource');
    }

    return this.sanitizeImage(image);
  }

  async deleteImage(imageId: string, userId: string): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(imageId)) {
      throw new BadRequestException('Invalid image ID format');
    }

    const image = await this.imageModel.findById(imageId).exec();
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this image resource');
    }

    // Delete asset from Cloudinary
    await this.cloudinaryService.deleteImage(image.publicId);

    // Delete document from MongoDB
    await this.imageModel.findByIdAndDelete(imageId).exec();

    return {
      success: true,
      message: 'Image deleted successfully',
    };
  }

  sanitizeImage(image: ImageDocument | any): SanitizedImage {
    const imgObj = typeof image.toObject === 'function' ? image.toObject() : image;
    return {
      id: imgObj._id.toString(),
      imageUrl: imgObj.imageUrl,
      publicId: imgObj.publicId,
      originalName: imgObj.originalName,
      mimeType: imgObj.mimeType,
      size: imgObj.size,
      width: imgObj.width || 0,
      height: imgObj.height || 0,
      source: imgObj.source || 'upload',
      capturedAt: imgObj.capturedAt,
      createdAt: imgObj.createdAt,
      updatedAt: imgObj.updatedAt,
    };
  }
}
