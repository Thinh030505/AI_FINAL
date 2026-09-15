import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { OCRResult, OCRResultSchema } from './schemas/ocr-result.schema';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OCRResult.name, schema: OCRResultSchema },
      { name: Image.name, schema: ImageSchema },
    ]),
    HttpModule,
  ],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
