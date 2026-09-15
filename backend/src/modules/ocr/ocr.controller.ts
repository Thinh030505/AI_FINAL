import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OcrService } from './ocr.service';
import { ProcessOcrDto } from './dto/process-ocr.dto';

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  async processOcr(@Body() dto: ProcessOcrDto, @Request() req: any) {
    const userId = req.user.id;
    const ocrResult = await this.ocrService.processOcr(dto.imageId, userId);
    return {
      success: true,
      message: 'OCR processing completed successfully',
      data: { ocrResult },
    };
  }

  @Get()
  async getUserOcrHistory(@Request() req: any) {
    const userId = req.user.id;
    const ocrResults = await this.ocrService.getUserOcrHistory(userId);
    return {
      success: true,
      data: { ocrResults },
    };
  }

  @Get(':id')
  async getOcrById(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const ocrResult = await this.ocrService.getOcrById(id, userId);
    return {
      success: true,
      data: { ocrResult },
    };
  }
}
