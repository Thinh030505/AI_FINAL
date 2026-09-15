import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OCRResultDocument = OCRResult & Document;

@Schema({ _id: false })
export class TextLineItem {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: [[Number]], required: true })
  box: number[][];
}

export const TextLineItemSchema = SchemaFactory.createForClass(TextLineItem);

@Schema({ timestamps: true })
export class OCRResult {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Image', required: true, index: true })
  imageId: MongooseSchema.Types.ObjectId;

  @Prop({ required: false, default: '' })
  fullText: string;

  @Prop({ required: false, default: '' })
  rawFullText?: string;

  @Prop({ type: [TextLineItemSchema], default: [] })
  lines: TextLineItem[];

  @Prop({ required: true, default: 0 })
  processingTimeMs: number;

  @Prop({ required: false, default: 0 })
  avgConfidence?: number;

  @Prop({ required: false, default: 0 })
  minConfidence?: number;

  @Prop({ required: false, default: false })
  isUncertain?: boolean;

  @Prop({ type: Object, required: false })
  debug?: Record<string, any>;
}

export const OCRResultSchema = SchemaFactory.createForClass(OCRResult);

// Compound index for fast queries sorted newest first by user
OCRResultSchema.index({ userId: 1, createdAt: -1 });
