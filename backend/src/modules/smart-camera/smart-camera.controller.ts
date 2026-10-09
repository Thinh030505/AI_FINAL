import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SmartCameraService } from './smart-camera.service';
import { AnalyzeFrameDto } from './dto/analyze-frame.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('smart-camera')
export class SmartCameraController {
  constructor(private readonly smartCameraService: SmartCameraService) {}

  @Post('analyze-frame')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async analyzeFrame(
    @Body() dto: AnalyzeFrameDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const analysis = await this.smartCameraService.analyzeFrame(dto, file);
    return {
      success: true,
      data: analysis,
    };
  }

  @Post('reset-tracker')
  @HttpCode(HttpStatus.OK)
  async resetTracker() {
    const result = await this.smartCameraService.resetTracker();
    return {
      success: true,
      data: result,
    };
  }

  @Get('status')
  async getStatus() {
    const status = await this.smartCameraService.getStatus();
    return {
      success: true,
      data: status,
    };
  }
}
