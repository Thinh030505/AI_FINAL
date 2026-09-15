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
import { OCRResult, OCRResultDocument } from './schemas/ocr-result.schema';
import { Image, ImageDocument } from '../images/schemas/image.schema';

export interface SanitizedOcrResult {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  fullText: string;
  rawFullText?: string;
  lines: Array<{
    text: string;
    confidence: number;
    box: number[][];
  }>;
  processingTimeMs: number;
  avgConfidence?: number;
  minConfidence?: number;
  isUncertain?: boolean;
  debug?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectModel(OCRResult.name) private readonly ocrResultModel: Model<OCRResultDocument>,
    @InjectModel(Image.name) private readonly imageModel: Model<ImageDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processOcr(imageId: string, userId: string): Promise<SanitizedOcrResult> {
    this.logger.log(`[OCR] Request received`);
    this.logger.log(`[OCR] imageId = ${imageId}`);

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

    this.logger.log(`[OCR] imageUrl = ${image.imageUrl}`);

    // 2. Obtain AI Service URL and send POST /ocr request
    const aiServiceUrl = this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
    this.logger.log(`[OCR] Calling AI Service = ${aiServiceUrl}/ocr`);
    
    let response;
    let aiResponseData;

    try {
      response = await firstValueFrom(
        this.httpService.post(
          `${aiServiceUrl}/ocr`,
          { imageUrl: image.imageUrl },
          { timeout: 300000 },
        ),
      );

      this.logger.log(`[OCR] AI Service response status = ${response.status}`);

      if (!response.data || !response.data.success) {
        throw new InternalServerErrorException('AI Service returned unsuccessful OCR response');
      }

      aiResponseData = response.data.data;
    } catch (err: any) {
      this.logger.error(`Error communicating with AI Service at ${aiServiceUrl}/ocr`, err.message);
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(`AI OCR Service is unavailable at ${aiServiceUrl}`);
      }
      if (err.response) {
        throw new BadGatewayException(
          `AI Service error: ${err.response.data?.detail || err.response.statusText}`,
        );
      }
      throw new BadGatewayException(`AI Service communication failure: ${err.message}`);
    }

    // 3. Save OCR Result in MongoDB Atlas
    try {
      const fullTextStr = aiResponseData.fullText ?? aiResponseData.full_text ?? '';
      const rawFullTextStr = aiResponseData.rawFullText ?? fullTextStr;
      const linesArray = aiResponseData.lines || [];
      const procTimeMs = aiResponseData.processingTimeMs ?? aiResponseData.processing_time_ms ?? 0;
      const avgConf = aiResponseData.avgConfidence ?? (linesArray.length > 0 ? linesArray.reduce((acc: number, l: any) => acc + l.confidence, 0) / linesArray.length : 0);
      const minConf = aiResponseData.minConfidence ?? (linesArray.length > 0 ? Math.min(...linesArray.map((l: any) => l.confidence)) : 0);
      const isUncertain = aiResponseData.isUncertain ?? false;
      const debugObj = aiResponseData.debug ?? {};

      this.logger.log(`[OCR] Full text length = ${fullTextStr.length}`);
      this.logger.log(`[OCR] Parsed lines count = ${linesArray.length}`);

      const createdOcrResult = new this.ocrResultModel({
        userId: new Types.ObjectId(userId),
        imageId: new Types.ObjectId(imageId),
        fullText: fullTextStr,
        rawFullText: rawFullTextStr,
        lines: linesArray,
        processingTimeMs: procTimeMs,
        avgConfidence: roundNum(avgConf, 4),
        minConfidence: roundNum(minConf, 4),
        isUncertain: isUncertain,
        debug: debugObj,
      });

      const savedResult = await createdOcrResult.save();
      this.logger.log(`[OCR] Saved OCR result to MongoDB with id = ${savedResult._id}`);
      return this.sanitizeOcrResult(savedResult, image);
    } catch (dbError) {
      this.logger.error('Failed to save OCR result to database', dbError);
      throw new InternalServerErrorException('Failed to save OCR result to database');
    }
  }

  async getUserOcrHistory(userId: string): Promise<SanitizedOcrResult[]> {
    const ocrResults = await this.ocrResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'imageId', select: 'imageUrl originalName' })
      .sort({ createdAt: -1 })
      .exec();

    return ocrResults.map((doc) => {
      const imgDoc = doc.imageId as any;
      return this.sanitizeOcrResult(doc, imgDoc);
    });
  }

  async getOcrById(id: string, userId: string): Promise<SanitizedOcrResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid OCR result ID format');
    }

    const ocrResult = await this.ocrResultModel
      .findById(id)
      .populate({ path: 'imageId', select: 'imageUrl originalName' })
      .exec();

    if (!ocrResult) {
      throw new NotFoundException('OCR result not found');
    }

    if (ocrResult.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this OCR resource');
    }

    const imgDoc = ocrResult.imageId as any;
    return this.sanitizeOcrResult(ocrResult, imgDoc);
  }

  private sanitizeOcrResult(doc: OCRResultDocument | any, imageDoc?: any): SanitizedOcrResult {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const imgObj = imageDoc && typeof imageDoc.toObject === 'function' ? imageDoc.toObject() : imageDoc;

    return {
      id: obj._id ? obj._id.toString() : obj.id,
      imageId: obj.imageId ? (typeof obj.imageId === 'object' ? obj.imageId._id.toString() : obj.imageId.toString()) : '',
      imageUrl: imgObj ? imgObj.imageUrl : undefined,
      originalName: imgObj ? imgObj.originalName : undefined,
      fullText: obj.fullText || '',
      rawFullText: obj.rawFullText || obj.fullText || '',
      lines: obj.lines || [],
      processingTimeMs: obj.processingTimeMs || 0,
      avgConfidence: obj.avgConfidence || 0,
      minConfidence: obj.minConfidence || 0,
      isUncertain: obj.isUncertain || false,
      debug: obj.debug || {},
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

function roundNum(num: number, decimals: number): number {
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
