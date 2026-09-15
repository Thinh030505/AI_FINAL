import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImagesService } from './images.service';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('source') source: string,
    @Body('capturedAt') capturedAt: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const image = await this.imagesService.uploadImage(file, userId, source, capturedAt);
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: { image },
    };
  }

  @Get()
  async getUserImages(@Request() req: any) {
    const userId = req.user.id;
    const images = await this.imagesService.getUserImages(userId);
    return {
      success: true,
      data: { images },
    };
  }

  @Get(':id')
  async getImageById(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const image = await this.imagesService.getImageById(id, userId);
    return {
      success: true,
      data: { image },
    };
  }

  @Delete(':id')
  async deleteImage(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    return this.imagesService.deleteImage(id, userId);
  }
}
