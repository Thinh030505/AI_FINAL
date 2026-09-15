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
  ImageAnalysis,
  ImageAnalysisDocument,
} from './schemas/image-analysis.schema';
import { Image, ImageDocument } from '../images/schemas/image.schema';

export interface SanitizedImageAnalysisResult {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  source?: string;
  status: string;
  analysisMode?: string;
  routingDecision?: Record<string, any>;
  qualityAssessment?: Record<string, any>;
  timings?: Record<string, number>;
  modules: Record<string, string>;
  imageWidth: number;
  imageHeight: number;
  totalProcessingTimeMs: number;
  fusedResult: {
    sceneType: string;
    environment: string;
    weather: string;
    description: string;
    objectCount: number;
    distinctObjectClasses: string[];
    dominantRegions: string[];
    hasText: boolean;
    textSnippet: string;
  };
  objectDetection: {
    model: string;
    detections: any[];
    objectCount: number;
    processingTimeMs: number;
  };
  segmentation: {
    model: string;
    regions: any[];
    processingTimeMs: number;
  };
  ocr: {
    fullText: string;
    lineCount: number;
    avgConfidence: number;
    processingTimeMs: number;
  };
  vision: {
    sceneType: string;
    environment: string;
    weather: string;
    mainObjects: string[];
    backgroundElements: string[];
    description: string;
    isFallback: boolean;
  };
  people?: any[];
  smallObjects?: any[];
  relationships?: any[];
  colors?: any[];
  deepInventory?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);

  constructor(
    @InjectModel(ImageAnalysis.name)
    private readonly imageAnalysisModel: Model<ImageAnalysisDocument>,
    @InjectModel(Image.name)
    private readonly imageModel: Model<ImageDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeImage(
    imageId: string,
    userId: string,
    mode?: string,
    forceOcr?: boolean,
  ): Promise<SanitizedImageAnalysisResult> {
    if (!Types.ObjectId.isValid(imageId)) {
      throw new BadRequestException('Invalid image ID format');
    }

    const image = await this.imageModel.findById(imageId);
    if (!image) {
      throw new NotFoundException(`Image with ID '${imageId}' not found`);
    }

    // Strict Anti-IDOR Ownership Verification
    if (image.userId.toString() !== userId.toString()) {
      this.logger.warn(
        `[SECURITY] Unauthorized analysis attempt: User ${userId} attempted to access Image ${imageId} owned by ${image.userId}`,
      );
      throw new ForbiddenException(
        'You do not have permission to analyze this image. Access denied.',
      );
    }

    const aiServiceBaseUrl =
      this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
    const endpoint = `${aiServiceBaseUrl}/image-analysis`;

    this.logger.log(
      `[ImageAnalysis] Initiating unified multimodal AI analysis (mode=${mode || 'balanced'}, forceOcr=${!!forceOcr}) for Image ${imageId} via ${endpoint}`,
    );

    let aiResponseData: any;
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          endpoint,
          {
            imageUrl: image.imageUrl,
            mode: mode || 'balanced',
            forceOcr: !!forceOcr,
          },
          {
            timeout: 180000,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
      aiResponseData = response.data?.data;
      if (!aiResponseData) {
        throw new Error('Empty or invalid response data payload from AI Service');
      }
    } catch (error: any) {
      this.logger.error(
        `[ImageAnalysis] AI Service request failed: ${error.message}`,
        error.stack,
      );

      if (error.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException(
          'AI Service is currently offline or unreachable. Please verify port 8000.',
        );
      }
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new BadGatewayException(
          'AI Service timed out while processing image understanding pipeline.',
        );
      }
      if (error.response?.status >= 400 && error.response?.status < 500) {
        const errorDetail =
          error.response?.data?.detail || error.response?.data?.message || error.message;
        throw new BadRequestException(`AI Service rejected request: ${errorDetail}`);
      }
      throw new BadGatewayException(
        `Failed to communicate with AI Service: ${error.message}`,
      );
    }

    // Persist to MongoDB Atlas
    try {
      const newAnalysis = new this.imageAnalysisModel({
        userId: new Types.ObjectId(userId),
        imageId: new Types.ObjectId(imageId),
        status: aiResponseData.status || 'success',
        analysisMode: aiResponseData.analysisMode || mode || 'balanced',
        routingDecision: aiResponseData.routingDecision || null,
        qualityAssessment: aiResponseData.qualityAssessment || null,
        timings: aiResponseData.timings || {},
        modules: aiResponseData.modules || {},
        imageWidth: aiResponseData.imageWidth || image.width || 1280,
        imageHeight: aiResponseData.imageHeight || image.height || 720,
        totalProcessingTimeMs: aiResponseData.totalProcessingTimeMs || 0,
        fusedResult: aiResponseData.fusedResult || {},
        objectDetection: aiResponseData.objectDetection || {},
        segmentation: aiResponseData.segmentation || {},
        ocr: aiResponseData.ocr || {},
        vision: aiResponseData.vision || {},
        people: aiResponseData.people || [],
        smallObjects: aiResponseData.smallObjects || [],
        relationships: aiResponseData.relationships || [],
        colors: aiResponseData.colors || [],
        deepInventory: aiResponseData.deepInventory || null,
      });

      const savedDoc = await newAnalysis.save();
      this.logger.log(
        `[ImageAnalysis] Analysis result saved to MongoDB with ID: ${savedDoc._id}`,
      );

      return this.sanitizeRecord(savedDoc, image);
    } catch (dbError: any) {
      this.logger.error(
        `[ImageAnalysis] Database error persisting analysis result: ${dbError.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to save analysis result to database.',
      );
    }
  }

  async getUserHistory(userId: string): Promise<SanitizedImageAnalysisResult[]> {
    const records = await this.imageAnalysisModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate<{ imageId: ImageDocument }>({
        path: 'imageId',
        select: 'imageUrl originalName source',
      })
      .exec();

    return records.map((rec) => {
      const populatedImg = rec.imageId as any;
      return this.sanitizeRecord(rec, populatedImg);
    });
  }

  async getAnalysisById(
    id: string,
    userId: string,
  ): Promise<SanitizedImageAnalysisResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid analysis ID format');
    }

    const record = await this.imageAnalysisModel
      .findById(id)
      .populate<{ imageId: ImageDocument }>({
        path: 'imageId',
        select: 'imageUrl originalName source',
      })
      .exec();

    if (!record) {
      throw new NotFoundException(`Analysis record with ID '${id}' not found`);
    }

    if (record.userId.toString() !== userId.toString()) {
      throw new ForbiddenException(
        'You do not have permission to view this analysis record. Access denied.',
      );
    }

    const populatedImg = record.imageId as any;
    return this.sanitizeRecord(record, populatedImg);
  }

  private sanitizeRecord(
    doc: any,
    img?: any,
  ): SanitizedImageAnalysisResult {
    return {
      id: doc._id.toString(),
      imageId: doc.imageId?._id
        ? doc.imageId._id.toString()
        : doc.imageId?.toString() || '',
      imageUrl: img?.imageUrl || undefined,
      originalName: img?.originalName || undefined,
      source: img?.source || 'upload',
      status: doc.status,
      analysisMode: doc.analysisMode || 'balanced',
      routingDecision: doc.routingDecision || undefined,
      qualityAssessment: doc.qualityAssessment || undefined,
      timings: doc.timings || undefined,
      modules: doc.modules || {},
      imageWidth: doc.imageWidth,
      imageHeight: doc.imageHeight,
      totalProcessingTimeMs: doc.totalProcessingTimeMs,
      fusedResult: doc.fusedResult as any,
      objectDetection: doc.objectDetection as any,
      segmentation: doc.segmentation as any,
      ocr: doc.ocr as any,
      vision: doc.vision as any,
      people: doc.people || [],
      smallObjects: doc.smallObjects || [],
      relationships: doc.relationships || [],
      colors: doc.colors || [],
      deepInventory: doc.deepInventory || undefined,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
