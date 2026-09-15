import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TranslationDocument = Translation & Document;

@Schema({ timestamps: true })
export class Translation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  sourceText: string;

  @Prop({ required: true })
  translatedText: string;

  @Prop({ required: true, default: 'auto' })
  sourceLanguage: string;

  @Prop({ required: true, default: 'en' })
  targetLanguage: string;

  @Prop({ required: true, default: 0 })
  processingTimeMs: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TranslationSchema = SchemaFactory.createForClass(Translation);
