import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Translation, TranslationDocument } from './schemas/translation.schema';
import { TranslateDto } from './dto/translate.dto';

export interface SanitizedTranslationResult {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  processingTimeMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    @InjectModel(Translation.name) private readonly translationModel: Model<TranslationDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async translateText(dto: TranslateDto, userId: string): Promise<SanitizedTranslationResult> {
    const { text, sourceLanguage = 'auto', targetLanguage = 'en' } = dto;

    this.logger.log(`[Translation] Request received from user ${userId}`);
    this.logger.log(`[Translation] src = ${sourceLanguage}, target = ${targetLanguage}, text_len = ${text.length}`);

    if (!text || !text.trim()) {
      throw new BadRequestException('Text for translation cannot be empty');
    }

    // 1. Obtain AI Service URL and send POST /translate request
    const aiServiceUrl = this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
    this.logger.log(`[Translation] Calling AI Service = ${aiServiceUrl}/translate`);

    let response;
    let aiResponseData;

    try {
      response = await firstValueFrom(
        this.httpService.post(
          `${aiServiceUrl}/translate`,
          {
            text: text,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage,
          },
          { timeout: 30000 },
        ),
      );

      this.logger.log(`[Translation] AI Service response status = ${response.status}`);

      if (!response.data || !response.data.success) {
        throw new InternalServerErrorException('AI Service returned unsuccessful translation response');
      }

      aiResponseData = response.data.data;
    } catch (err: any) {
      this.logger.error(`Error communicating with AI Service at ${aiServiceUrl}/translate`, err.message);
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(`Translation service is currently unavailable`);
      }
      if (err.response) {
        throw new BadGatewayException(
          `Translation service error: ${err.response.data?.detail || err.response.statusText}`,
        );
      }
      throw new BadGatewayException(`Translation service communication failure: ${err.message}`);
    }

    // 2. Save Translation in MongoDB Atlas
    try {
      const createdTranslation = new this.translationModel({
        userId: new Types.ObjectId(userId),
        sourceText: aiResponseData.sourceText || text,
        translatedText: aiResponseData.translatedText || '',
        sourceLanguage: aiResponseData.sourceLanguage || sourceLanguage,
        targetLanguage: aiResponseData.targetLanguage || targetLanguage,
        processingTimeMs: aiResponseData.processingTimeMs || 0,
      });

      const savedResult = await createdTranslation.save();
      this.logger.log(`[Translation] Saved translation record to MongoDB with id = ${savedResult._id}`);
      return this.sanitizeTranslation(savedResult);
    } catch (dbError) {
      this.logger.error('Failed to save translation result to database', dbError);
      throw new InternalServerErrorException('Failed to save translation result to database');
    }
  }

  async getUserTranslationHistory(userId: string): Promise<SanitizedTranslationResult[]> {
    const records = await this.translationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return records.map((doc) => this.sanitizeTranslation(doc));
  }

  private sanitizeTranslation(doc: TranslationDocument | any): SanitizedTranslationResult {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
      id: obj._id ? obj._id.toString() : obj.id,
      sourceText: obj.sourceText || '',
      translatedText: obj.translatedText || '',
      sourceLanguage: obj.sourceLanguage || 'auto',
      targetLanguage: obj.targetLanguage || 'en',
      processingTimeMs: obj.processingTimeMs || 0,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}
