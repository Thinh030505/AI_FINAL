import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import {
  ObjectDetection,
  ObjectDetectionSchema,
} from './schemas/object-detection.schema';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { ObjectDetectionService } from './object-detection.service';
import { ObjectDetectionController } from './object-detection.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ObjectDetection.name, schema: ObjectDetectionSchema },
      { name: Image.name, schema: ImageSchema },
    ]),
    HttpModule,
  ],
  controllers: [ObjectDetectionController],
  providers: [ObjectDetectionService],
  exports: [ObjectDetectionService],
})
export class ObjectDetectionModule {}
