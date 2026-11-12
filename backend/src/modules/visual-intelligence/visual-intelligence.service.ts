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
  VisualIntelligence,
  VisualIntelligenceDocument,
} from './schemas/visual-intelligence.schema';
import { Image, ImageDocument } from '../images/schemas/image.schema';
import { ImageBufferCacheService } from '../images/image-buffer-cache.service';

export interface SanitizedVisualIntelligenceResult {
  id: string;
  imageId: string;
  imageUrl: string;
  originalName: string;
  imageWidth: number;
  imageHeight: number;
  analysis: {
    objects: Array<{
      id: string;
      classId: number;
      label: string;
      confidence: number;
      bbox: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
    }>;
    texts: Array<{
      id: string;
      content: string;
      confidence: number;
      bbox: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
      polygon?: number[][];
    }>;
    fullText: string;
  };
  engines: Record<string, any>;
  totalProcessingTimeMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class VisualIntelligenceService {
  private readonly logger = new Logger(VisualIntelligenceService.name);

  constructor(
    @InjectModel(VisualIntelligence.name)
    private readonly visualIntelligenceModel: Model<VisualIntelligenceDocument>,
    @InjectModel(Image.name)
    private readonly imageModel: Model<ImageDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bufferCache: ImageBufferCacheService,
  ) {}

  async analyzeImage(
    imageId: string,
    userId: string,
    confidenceThreshold?: number,
  ): Promise<SanitizedVisualIntelligenceResult> {
    this.logger.log(`[VisualIntelligence] Request received for imageId = ${imageId} by user = ${userId}`);

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

    const aiServiceUrl =
      this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';

    let response;
    let aiData;

    // 2. Optimization: Try in-memory buffer transfer first to avoid redundant downloads
    const cachedBuffer = this.bufferCache.get(imageId);

    try {
      if (cachedBuffer) {
        this.logger.log(
          `[VisualIntelligence] Direct byte transfer to AI Service at ${aiServiceUrl}/visual-intelligence/direct for imageId = ${imageId}`,
        );

        try {
          const formData = new FormData();
          const blob = new Blob([new Uint8Array(cachedBuffer.buffer)], {
            type: cachedBuffer.mimeType || 'image/jpeg',
          });
          formData.append('file', blob, cachedBuffer.originalName || 'image.jpg');
          if (confidenceThreshold) {
            formData.append('confidence_threshold', confidenceThreshold.toString());
          }

          response = await firstValueFrom(
            this.httpService.post(
              `${aiServiceUrl}/visual-intelligence/direct`,
              formData,
              { timeout: 90000 },
            ),
          );
        } catch (directErr: any) {
          this.logger.warn(
            `[VisualIntelligence] Direct byte transfer note (${directErr.message}). Falling back to URL endpoint.`,
          );
          response = await firstValueFrom(
            this.httpService.post(
              `${aiServiceUrl}/visual-intelligence/analyze`,
              {
                imageUrl: image.imageUrl,
                confidence_threshold: confidenceThreshold || 0.25,
              },
              { timeout: 90000 },
            ),
          );
        }
      } else {
        this.logger.log(
          `[VisualIntelligence] Calling AI Service at ${aiServiceUrl}/visual-intelligence/analyze for imageId = ${imageId}`,
        );
        response = await firstValueFrom(
          this.httpService.post(
            `${aiServiceUrl}/visual-intelligence/analyze`,
            {
              imageUrl: image.imageUrl,
              confidence_threshold: confidenceThreshold || 0.25,
            },
            { timeout: 90000 },
          ),
        );
      }

      if (!response.data || !response.data.success) {
        throw new InternalServerErrorException('AI Service returned unsuccessful visual intelligence response');
      }

      aiData = response.data;
    } catch (err: any) {
      this.logger.error(
        `[VisualIntelligence] Error communicating with AI Service at ${aiServiceUrl}: ${err.message}`,
      );
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(`AI Visual Intelligence Service is unreachable at ${aiServiceUrl}`);
      }
      if (err.response) {
        throw new BadGatewayException(
          err.response.data?.detail || err.response.data?.message || 'AI Service returned an error during visual intelligence analysis',
        );
      }
      throw new InternalServerErrorException(err.message || 'Failed to process visual intelligence analysis');
    }

    // 3. Map & Save to MongoDB
    const mappedObjects = (aiData.analysis?.objects || []).map((o: any) => ({
      id: o.id,
      classId: o.class_id,
      label: o.label,
      confidence: o.confidence,
      bbox: {
        x1: o.bbox.x1,
        y1: o.bbox.y1,
        x2: o.bbox.x2,
        y2: o.bbox.y2,
      },
    }));

    const mappedTexts = (aiData.analysis?.texts || []).map((t: any) => ({
      id: t.id,
      content: t.content,
      confidence: t.confidence,
      bbox: {
        x1: t.bbox.x1,
        y1: t.bbox.y1,
        x2: t.bbox.x2,
        y2: t.bbox.y2,
      },
      polygon: t.polygon || [],
    }));

    const fullText = aiData.analysis?.full_text || mappedTexts.map((t: any) => t.content).join('\n');
    const totalProcessingTimeMs = aiData.timings?.total_ms || 0;

    const record = new this.visualIntelligenceModel({
      userId: new Types.ObjectId(userId),
      imageId: new Types.ObjectId(imageId),
      imageUrl: image.imageUrl,
      originalName: image.originalName || 'Image',
      imageWidth: aiData.image?.width || image.width || 0,
      imageHeight: aiData.image?.height || image.height || 0,
      analysis: {
        objects: mappedObjects,
        texts: mappedTexts,
        fullText,
      },
      engines: aiData.engines || {},
      totalProcessingTimeMs,
    });

    const saved = await record.save();
    return this.sanitizeRecord(saved, image);
  }

  async getUserHistory(userId: string): Promise<SanitizedVisualIntelligenceResult[]> {
    const records = await this.visualIntelligenceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('imageId')
      .exec();

    return records.map((rec) => this.sanitizeRecord(rec, rec.imageId as any));
  }

  async getById(id: string, userId: string): Promise<SanitizedVisualIntelligenceResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid record ID format');
    }

    const record = await this.visualIntelligenceModel
      .findById(id)
      .populate('imageId')
      .exec();

    if (!record) {
      throw new NotFoundException('Visual intelligence record not found');
    }

    if (record.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this record');
    }

    return this.sanitizeRecord(record, record.imageId as any);
  }

  private sanitizeRecord(
    record: VisualIntelligenceDocument,
    image?: ImageDocument,
  ): SanitizedVisualIntelligenceResult {
    return {
      id: record._id.toString(),
      imageId: record.imageId ? record.imageId.toString() : '',
      imageUrl: record.imageUrl || (image ? image.imageUrl : ''),
      originalName: record.originalName || (image ? image.originalName : 'Image'),
      imageWidth: record.imageWidth,
      imageHeight: record.imageHeight,
      analysis: {
        objects: (record.analysis?.objects || []).map((o) => ({
          id: o.id,
          classId: o.classId,
          label: o.label,
          confidence: o.confidence,
          bbox: {
            x1: o.bbox.x1,
            y1: o.bbox.y1,
            x2: o.bbox.x2,
            y2: o.bbox.y2,
          },
        })),
        texts: (record.analysis?.texts || []).map((t) => ({
          id: t.id,
          content: t.content,
          confidence: t.confidence,
          bbox: {
            x1: t.bbox.x1,
            y1: t.bbox.y1,
            x2: t.bbox.x2,
            y2: t.bbox.y2,
          },
          polygon: t.polygon,
        })),
        fullText: record.analysis?.fullText || '',
      },
      engines: record.engines || {},
      totalProcessingTimeMs: record.totalProcessingTimeMs || 0,
      createdAt: (record as any).createdAt,
      updatedAt: (record as any).updatedAt,
    };
  }
}
