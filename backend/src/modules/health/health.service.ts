import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async checkHealth() {
    let dbStatus = 'disconnected';
    try {
      if (this.connection && this.connection.readyState === 1) {
        dbStatus = 'connected';
      }
    } catch (error) {
      this.logger.warn('MongoDB connection state check warning');
    }

    let aiServiceStatus = 'disconnected';
    try {
      const aiUrl = this.configService.get<string>('aiServiceUrl') || 'http://localhost:8000';
      const response = await firstValueFrom(
        this.httpService.get(`${aiUrl}/health`, { timeout: 3000 })
      );
      if (response?.data?.status === 'ok') {
        aiServiceStatus = 'connected';
      }
    } catch (error) {
      this.logger.warn(`AI Service health check reached: disconnected`);
    }

    return {
      status: 'ok',
      service: 'backend',
      database: dbStatus,
      ai_service: aiServiceStatus,
    };
  }
}
