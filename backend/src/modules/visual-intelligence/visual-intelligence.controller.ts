import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  VisualIntelligenceService,
  SanitizedVisualIntelligenceResult,
} from './visual-intelligence.service';
import { AnalyzeVisualIntelligenceDto } from './dto/analyze-visual-intelligence.dto';

export interface VisualIntelligenceResponseFormat {
  success: boolean;
  message: string;
  data: {
    visualIntelligence: SanitizedVisualIntelligenceResult;
  };
}

export interface VisualIntelligenceHistoryResponseFormat {
  success: boolean;
  data: {
    visualIntelligences: SanitizedVisualIntelligenceResult[];
  };
}

@Controller('visual-intelligence')
@UseGuards(JwtAuthGuard)
export class VisualIntelligenceController {
  constructor(
    private readonly visualIntelligenceService: VisualIntelligenceService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeImage(
    @Body() dto: AnalyzeVisualIntelligenceDto,
    @Request() req: any,
  ): Promise<VisualIntelligenceResponseFormat> {
    const userId = req.user.id;
    const result = await this.visualIntelligenceService.analyzeImage(
      dto.imageId,
      userId,
      dto.confidenceThreshold,
    );
    return {
      success: true,
      message: 'Dual-engine visual intelligence analysis completed successfully',
      data: {
        visualIntelligence: result,
      },
    };
  }

  @Get('history')
  async getUserHistory(
    @Request() req: any,
  ): Promise<VisualIntelligenceHistoryResponseFormat> {
    const userId = req.user.id;
    const results = await this.visualIntelligenceService.getUserHistory(userId);
    return {
      success: true,
      data: {
        visualIntelligences: results,
      },
    };
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<VisualIntelligenceResponseFormat> {
    const userId = req.user.id;
    const result = await this.visualIntelligenceService.getById(id, userId);
    return {
      success: true,
      message: 'Visual intelligence record retrieved successfully',
      data: {
        visualIntelligence: result,
      },
    };
  }
}
