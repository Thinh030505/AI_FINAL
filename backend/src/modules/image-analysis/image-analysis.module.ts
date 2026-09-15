import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import {
  ImageAnalysis,
  ImageAnalysisSchema,
} from './schemas/image-analysis.schema';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { ImageAnalysisService } from './image-analysis.service';
import { ImageAnalysisController } from './image-analysis.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImageAnalysis.name, schema: ImageAnalysisSchema },
      { name: Image.name, schema: ImageSchema },
    ]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [ImageAnalysisController],
  providers: [ImageAnalysisService],
  exports: [ImageAnalysisService],
})
export class ImageAnalysisModule {}
