import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ImageAnalysisDocument = ImageAnalysis & Document;

@Schema({ _id: false })
export class DetectionBox {
  @Prop({ required: true })
  x1: number;

  @Prop({ required: true })
  y1: number;

  @Prop({ required: true })
  x2: number;

  @Prop({ required: true })
  y2: number;
}

@Schema({ _id: false })
export class DetectionItemSchema {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  classId: number;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: DetectionBox, required: true })
  box: DetectionBox;
}

@Schema({ _id: false })
export class SemanticRegionSchema {
  @Prop({ required: true })
  label: string;

  @Prop()
  rawLabel: string;

  @Prop({ required: true })
  pixelCount: number;

  @Prop({ required: true })
  regionPercentage: number;
}

@Schema({ _id: false })
export class ObjectDetectionSub {
  @Prop({ default: 'yolo11n' })
  model: string;

  @Prop({ type: [DetectionItemSchema], default: [] })
  detections: DetectionItemSchema[];

  @Prop({ default: 0 })
  objectCount: number;

  @Prop({ default: 0 })
  processingTimeMs: number;
}

@Schema({ _id: false })
export class SegmentationSub {
  @Prop({ default: 'segformer-b0-ade20k' })
  model: string;

  @Prop({ type: [SemanticRegionSchema], default: [] })
  regions: SemanticRegionSchema[];

  @Prop({ default: 0 })
  processingTimeMs: number;
}

@Schema({ _id: false })
export class OcrSub {
  @Prop({ default: '' })
  fullText: string;

  @Prop({ default: 0 })
  lineCount: number;

  @Prop({ default: 0 })
  avgConfidence: number;

  @Prop({ default: 0 })
  processingTimeMs: number;
}

@Schema({ _id: false })
export class VisionSub {
  @Prop({ default: '' })
  sceneType: string;

  @Prop({ default: '' })
  environment: string;

  @Prop({ default: '' })
  weather: string;

  @Prop({ type: [String], default: [] })
  mainObjects: string[];

  @Prop({ type: [String], default: [] })
  backgroundElements: string[];

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  isFallback: boolean;
}

@Schema({ _id: false })
export class FusedResultSub {
  @Prop({ required: true })
  sceneType: string;

  @Prop({ required: true })
  environment: string;

  @Prop({ required: true })
  weather: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 0 })
  objectCount: number;

  @Prop({ type: [String], default: [] })
  distinctObjectClasses: string[];

  @Prop({ type: [String], default: [] })
  dominantRegions: string[];

  @Prop({ default: false })
  hasText: boolean;

  @Prop({ default: '' })
  textSnippet: string;
}

@Schema({ timestamps: true, collection: 'imageanalyses' })
export class ImageAnalysis {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Image', required: true, index: true })
  imageId: Types.ObjectId;

  @Prop({ default: 'success' })
  status: string;

  @Prop({ default: 'balanced' })
  analysisMode: string;

  @Prop({ type: Object, default: null })
  routingDecision?: Record<string, any>;

  @Prop({ type: Object, default: null })
  qualityAssessment?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  timings?: Record<string, number>;

  @Prop({ type: Object, default: {} })
  modules: Record<string, string>;

  @Prop({ required: true })
  imageWidth: number;

  @Prop({ required: true })
  imageHeight: number;

  @Prop({ required: true })
  totalProcessingTimeMs: number;

  @Prop({ type: FusedResultSub, required: true })
  fusedResult: FusedResultSub;

  @Prop({ type: ObjectDetectionSub, required: true })
  objectDetection: ObjectDetectionSub;

  @Prop({ type: SegmentationSub, required: true })
  segmentation: SegmentationSub;

  @Prop({ type: OcrSub, required: true })
  ocr: OcrSub;

  @Prop({ type: VisionSub, required: true })
  vision: VisionSub;

  @Prop({ type: Array, default: [] })
  people?: any[];

  @Prop({ type: Array, default: [] })
  smallObjects?: any[];

  @Prop({ type: Array, default: [] })
  relationships?: any[];

  @Prop({ type: Array, default: [] })
  colors?: any[];

  @Prop({ type: Object, default: null })
  deepInventory?: Record<string, any>;
}

export const ImageAnalysisSchema = SchemaFactory.createForClass(ImageAnalysis);

ImageAnalysisSchema.index({ userId: 1, createdAt: -1 });
ImageAnalysisSchema.index({ imageId: 1 });
