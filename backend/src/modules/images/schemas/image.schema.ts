import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema({ timestamps: true })
export class Image {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  publicId: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: false, default: 0 })
  width?: number;

  @Prop({ required: false, default: 0 })
  height?: number;

  @Prop({ required: false, default: 'upload' })
  source?: string;

  @Prop({ required: false })
  capturedAt?: Date;
}

export const ImageSchema = SchemaFactory.createForClass(Image);

// Index for userId and createdAt for fast user query sorted by newest first
ImageSchema.index({ userId: 1, createdAt: -1 });
