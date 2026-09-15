import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ImageAnalysisService,
  SanitizedImageAnalysisResult,
} from './image-analysis.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';

export interface ImageAnalysisResponseFormat {
  success: boolean;
  message: string;
  data: {
    analysis: SanitizedImageAnalysisResult;
  };
}

export interface ImageAnalysisHistoryResponseFormat {
  success: boolean;
  data: {
    analyses: SanitizedImageAnalysisResult[];
  };
}

@Controller('image-analysis')
@UseGuards(JwtAuthGuard)
export class ImageAnalysisController {
  constructor(
    private readonly imageAnalysisService: ImageAnalysisService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyzeImage(
    @Body() analyzeDto: AnalyzeImageDto,
    @Request() req: any,
  ): Promise<ImageAnalysisResponseFormat> {
    const userId = req.user.id;
    const result = await this.imageAnalysisService.analyzeImage(
      analyzeDto.imageId,
      userId,
      analyzeDto.mode,
      analyzeDto.forceOcr,
    );
    return {
      success: true,
      message: 'Unified multimodal AI image analysis completed successfully',
      data: {
        analysis: result,
      },
    };
  }

  @Get()
  async getAnalysisHistory(
    @Request() req: any,
  ): Promise<ImageAnalysisHistoryResponseFormat> {
    const userId = req.user.id;
    const analyses = await this.imageAnalysisService.getUserHistory(userId);
    return {
      success: true,
      data: {
        analyses,
      },
    };
  }

  @Get(':id')
  async getAnalysisById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ImageAnalysisResponseFormat> {
    const userId = req.user.id;
    const result = await this.imageAnalysisService.getAnalysisById(id, userId);
    return {
      success: true,
      message: 'Image analysis record retrieved successfully',
      data: {
        analysis: result,
      },
    };
  }
}
