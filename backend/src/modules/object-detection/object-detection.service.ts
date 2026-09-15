import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ObjectDetection,
  ObjectDetectionDocument,
} from './schemas/object-detection.schema';
import { Image, ImageDocument } from '../images/schemas/image.schema';

export interface SanitizedObjectDetectionResult {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  model: string;
  imageWidth: number;
  imageHeight: number;
  objectCount: number;
  processingTimeMs: number;
  detections: Array<{
    label: string;
    classId: number;
    confidence: number;
    box: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class ObjectDetectionService {
  private readonly logger = new Logger(ObjectDetectionService.name);

  constructor(
    @InjectModel(ObjectDetection.name)
    private readonly objectDetectionModel: Model<ObjectDetectionDocument>,
    @InjectModel(Image.name)
    private readonly imageModel: Model<ImageDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeObjects(
    imageId: string,
    userId: string,
  ): Promise<SanitizedObjectDetectionResult> {
    this.logger.log(`[ObjectDetection] Request received for imageId = ${imageId} by user = ${userId}`);

    if (!Types.ObjectId.isValid(imageId)) {
      throw new BadRequestException('Invalid image ID format');
    }

    // 1. Verify image exists and belongs strictly to the authenticated user
    const image = await this.imageModel.findById(imageId).exec();
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this image resource');
    }

    // 2. Call FastAPI AI Service
    const aiServiceUrl =
      this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
    this.logger.log(`[ObjectDetection] Calling AI Service at ${aiServiceUrl}/object-detection`);

    let response;
    let aiData;

    try {
      response = await firstValueFrom(
        this.httpService.post(
          `${aiServiceUrl}/object-detection`,
          { imageUrl: image.imageUrl },
          { timeout: 45000 },
        ),
      );

      if (!response.data || !response.data.success) {
        throw new InternalServerErrorException(
          'AI Service returned unsuccessful object detection response',
        );
      }

      aiData = response.data.data;
    } catch (err: any) {
      this.logger.error(
        `Error communicating with AI Service at ${aiServiceUrl}/object-detection`,
        err.message,
      );
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(
          `AI Object Detection Service is unavailable at ${aiServiceUrl}`,
        );
      }
      if (err.response) {
        throw new BadGatewayException(
          `AI Service error: ${err.response.data?.detail || err.response.statusText}`,
        );
      }
      throw new BadGatewayException(
        `AI Service communication failure: ${err.message}`,
      );
    }

    // 3. Save to MongoDB
    try {
      const detections = aiData.detections || [];
      const createdRecord = new this.objectDetectionModel({
        userId: new Types.ObjectId(userId),
        imageId: new Types.ObjectId(imageId),
        model: aiData.model || 'yolo11n',
        imageWidth: aiData.imageWidth || image.width || 0,
        imageHeight: aiData.imageHeight || image.height || 0,
        detections: detections,
        objectCount: aiData.objectCount ?? detections.length,
        processingTimeMs: aiData.processingTimeMs || 0,
      });

      const saved = await createdRecord.save();
      this.logger.log(`[ObjectDetection] Saved record to MongoDB with id = ${saved._id}`);
      return this.sanitizeResult(saved, image);
    } catch (dbError) {
      this.logger.error('Failed to save Object Detection result to database', dbError);
      throw new InternalServerErrorException('Failed to save detection result to database');
    }
  }

  async getUserHistory(userId: string): Promise<SanitizedObjectDetectionResult[]> {
    const results = await this.objectDetectionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'imageId', select: 'imageUrl originalName' })
      .sort({ createdAt: -1 })
      .exec();

    return results.map((doc) => {
      const imgDoc = doc.imageId as any;
      return this.sanitizeResult(doc, imgDoc);
    });
  }

  async getById(id: string, userId: string): Promise<SanitizedObjectDetectionResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid object detection record ID format');
    }

    const record = await this.objectDetectionModel
      .findById(id)
      .populate({ path: 'imageId', select: 'imageUrl originalName' })
      .exec();

    if (!record) {
      throw new NotFoundException('Object detection record not found');
    }

    if (record.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this detection resource');
    }

    const imgDoc = record.imageId as any;
    return this.sanitizeResult(record, imgDoc);
  }

  private sanitizeResult(
    doc: ObjectDetectionDocument | any,
    imageDoc?: any,
  ): SanitizedObjectDetectionResult {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const imgObj =
      imageDoc && typeof imageDoc.toObject === 'function'
        ? imageDoc.toObject()
        : imageDoc;

    return {
      id: obj._id ? obj._id.toString() : obj.id,
      imageId: obj.imageId
        ? typeof obj.imageId === 'object'
          ? obj.imageId._id.toString()
          : obj.imageId.toString()
        : '',
      imageUrl: imgObj ? imgObj.imageUrl : undefined,
      originalName: imgObj ? imgObj.originalName : undefined,
      model: obj.model || 'yolo11n',
      imageWidth: obj.imageWidth || 0,
      imageHeight: obj.imageHeight || 0,
      objectCount: obj.objectCount || 0,
      processingTimeMs: obj.processingTimeMs || 0,
      detections: (obj.detections || []).map((d: any) => ({
        label: d.label,
        classId: d.classId,
        confidence: d.confidence,
        box: {
          x1: d.box?.x1 ?? 0,
          y1: d.box?.y1 ?? 0,
          x2: d.box?.x2 ?? 0,
          y2: d.box?.y2 ?? 0,
        },
      })),
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}
