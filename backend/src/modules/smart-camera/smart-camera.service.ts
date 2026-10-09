import {
  Injectable,
  Logger,
  BadGatewayException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AnalyzeFrameDto } from './dto/analyze-frame.dto';
import * as FormData from 'form-data';

@Injectable()
export class SmartCameraService {
  private readonly logger = new Logger(SmartCameraService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getAiServiceUrl(): string {
    return this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
  }

  async analyzeFrame(dto: AnalyzeFrameDto, file?: Express.Multer.File): Promise<any> {
    const aiBase = this.getAiServiceUrl();
    const endpoint = `${aiBase}/smart-camera/analyze-frame`;

    try {
      if (file && file.buffer) {
        // Forward as multipart form-data
        const form = new FormData();
        form.append('file', file.buffer, {
          filename: file.originalname || 'frame.jpg',
          contentType: file.mimetype || 'image/jpeg',
        });
        form.append('frameId', String(dto.frameId || 1));
        form.append('mode', String(dto.mode || 'everything'));
        form.append('confidenceThreshold', String(dto.confidenceThreshold || 0.25));
        form.append('enableOcr', String(!!dto.enableOcr));
        form.append('targetLang', String(dto.targetLang || 'vi'));
        if (dto.originalWidth) form.append('originalWidth', String(dto.originalWidth));
        if (dto.originalHeight) form.append('originalHeight', String(dto.originalHeight));

        const response = await firstValueFrom(
          this.httpService.post(endpoint, form, {
            headers: form.getHeaders(),
            timeout: 30000,
          }),
        );
        return response.data;
      } else if (dto.imageBase64) {
        // Forward as JSON
        const response = await firstValueFrom(
          this.httpService.post(
            endpoint,
            {
              imageBase64: dto.imageBase64,
              frameId: dto.frameId || 1,
              mode: dto.mode || 'everything',
              confidenceThreshold: dto.confidenceThreshold || 0.25,
              enableOcr: !!dto.enableOcr,
              targetLang: dto.targetLang || 'vi',
              originalWidth: dto.originalWidth,
              originalHeight: dto.originalHeight,
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000,
            },
          ),
        );
        return response.data;
      } else {
        throw new BadRequestException('Either image file or imageBase64 must be provided');
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException('AI Microservice is unreachable on port 8000');
      }
      if (error.response?.data) {
        throw new BadGatewayException(error.response.data);
      }
      throw new BadGatewayException(error.message || 'Error communicating with AI microservice');
    }
  }

  async resetTracker(): Promise<any> {
    const aiBase = this.getAiServiceUrl();
    const endpoint = `${aiBase}/smart-camera/reset-tracker`;
    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, {}, { timeout: 5000 }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to reset AI tracker: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async getStatus(): Promise<any> {
    const aiBase = this.getAiServiceUrl();
    const endpoint = `${aiBase}/smart-camera/status`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(endpoint, { timeout: 5000 }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get smart camera status: ${error.message}`);
      return {
        status: 'offline',
        error: error.message,
      };
    }
  }
}
