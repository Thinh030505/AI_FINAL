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
import { ObjectDetectionService } from './object-detection.service';
import { AnalyzeObjectsDto } from './dto/analyze-objects.dto';

@Controller('object-detection')
@UseGuards(JwtAuthGuard)
export class ObjectDetectionController {
  constructor(
    private readonly objectDetectionService: ObjectDetectionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyzeObjects(@Body() dto: AnalyzeObjectsDto, @Request() req: any) {
    const userId = req.user.id;
    const result = await this.objectDetectionService.analyzeObjects(
      dto.imageId,
      userId,
    );
    return {
      success: true,
      message: 'Object detection completed successfully',
      data: {
        objectDetection: result,
      },
    };
  }

  @Get()
  async getUserHistory(@Request() req: any) {
    const userId = req.user.id;
    const results = await this.objectDetectionService.getUserHistory(userId);
    return {
      success: true,
      data: {
        objectDetections: results,
      },
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const result = await this.objectDetectionService.getById(id, userId);
    return {
      success: true,
      data: {
        objectDetection: result,
      },
    };
  }
}
