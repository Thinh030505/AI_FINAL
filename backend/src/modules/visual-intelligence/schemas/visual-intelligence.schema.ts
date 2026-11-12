import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VisualIntelligenceDocument = VisualIntelligence & Document;

@Schema({ _id: false })
export class BBoxItem {
  @Prop({ required: true })
  x1: number;

  @Prop({ required: true })
  y1: number;

  @Prop({ required: true })
  x2: number;

  @Prop({ required: true })
  y2: number;
}
export const BBoxItemSchema = SchemaFactory.createForClass(BBoxItem);

@Schema({ _id: false })
export class DetectedObjectItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  classId: number;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: BBoxItemSchema, required: true })
  bbox: BBoxItem;
}
export const DetectedObjectItemSchema = SchemaFactory.createForClass(DetectedObjectItem);

@Schema({ _id: false })
export class DetectedTextItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: BBoxItemSchema, required: true })
  bbox: BBoxItem;

  @Prop({ type: [[Number]], default: [] })
  polygon?: number[][];
}
export const DetectedTextItemSchema = SchemaFactory.createForClass(DetectedTextItem);

@Schema({ _id: false })
export class EngineStatusItem {
  @Prop({ required: true })
  status: string; // "success" | "no_results" | "error"

  @Prop()
  model?: string;

  @Prop()
  engine?: string;

  @Prop({ default: 0 })
  count?: number;

  @Prop({ default: 0 })
  lineCount?: number;

  @Prop()
  fullText?: string;

  @Prop({ default: 0 })
  processingTimeMs?: number;

  @Prop()
  message?: string;
}
export const EngineStatusItemSchema = SchemaFactory.createForClass(EngineStatusItem);

@Schema({ _id: false })
export class VisualIntelligenceAnalysisSchemaClass {
  @Prop({ type: [DetectedObjectItemSchema], default: [] })
  objects: DetectedObjectItem[];

  @Prop({ type: [DetectedTextItemSchema], default: [] })
  texts: DetectedTextItem[];

  @Prop({ default: '' })
  fullText: string;
}
export const VisualIntelligenceAnalysisSchema = SchemaFactory.createForClass(VisualIntelligenceAnalysisSchemaClass);

@Schema({ timestamps: true })
export class VisualIntelligence {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Image', required: true, index: true })
  imageId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  imageWidth: number;

  @Prop({ required: true })
  imageHeight: number;

  @Prop({ type: VisualIntelligenceAnalysisSchema, required: true })
  analysis: VisualIntelligenceAnalysisSchemaClass;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  engines: Record<string, any>;

  @Prop({ required: true, default: 0 })
  totalProcessingTimeMs: number;
}

export const VisualIntelligenceSchema = SchemaFactory.createForClass(VisualIntelligence);
