import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import {
  VisualIntelligence,
  VisualIntelligenceSchema,
} from './schemas/visual-intelligence.schema';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { ImagesModule } from '../images/images.module';
import { VisualIntelligenceService } from './visual-intelligence.service';
import { VisualIntelligenceController } from './visual-intelligence.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisualIntelligence.name, schema: VisualIntelligenceSchema },
      { name: Image.name, schema: ImageSchema },
    ]),
    HttpModule,
    ImagesModule,
  ],
  controllers: [VisualIntelligenceController],
  providers: [VisualIntelligenceService],
  exports: [VisualIntelligenceService],
})
export class VisualIntelligenceModule {}
