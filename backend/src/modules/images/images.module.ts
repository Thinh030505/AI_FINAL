import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Image, ImageSchema } from './schemas/image.schema';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ImageBufferCacheService } from './image-buffer-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }]),
    CloudinaryModule,
  ],
  controllers: [ImagesController],
  providers: [ImagesService, ImageBufferCacheService],
  exports: [ImagesService, ImageBufferCacheService],
})
export class ImagesModule {}
