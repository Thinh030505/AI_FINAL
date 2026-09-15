import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ObjectDetectionDocument = ObjectDetection & Document;

@Schema({ _id: false })
export class BoundingBoxItem {
  @Prop({ required: true })
  x1: number;

  @Prop({ required: true })
  y1: number;

  @Prop({ required: true })
  x2: number;

  @Prop({ required: true })
  y2: number;
}

export const BoundingBoxItemSchema = SchemaFactory.createForClass(BoundingBoxItem);

@Schema({ _id: false })
export class DetectionItem {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  classId: number;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: BoundingBoxItemSchema, required: true })
  box: BoundingBoxItem;
}

export const DetectionItemSchema = SchemaFactory.createForClass(DetectionItem);

@Schema({ timestamps: true })
export class ObjectDetection {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Image', required: true, index: true })
  imageId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: 'yolo11n' })
  model: string;

  @Prop({ required: true })
  imageWidth: number;

  @Prop({ required: true })
  imageHeight: number;

  @Prop({ type: [DetectionItemSchema], default: [] })
  detections: DetectionItem[];

  @Prop({ required: true, default: 0 })
  objectCount: number;

  @Prop({ required: true, default: 0 })
  processingTimeMs: number;
}

export const ObjectDetectionSchema = SchemaFactory.createForClass(ObjectDetection);
ObjectDetectionSchema.index({ userId: 1, createdAt: -1 });
