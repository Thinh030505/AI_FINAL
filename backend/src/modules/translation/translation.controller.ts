import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranslationService, SanitizedTranslationResult } from './translation.service';
import { TranslateDto } from './dto/translate.dto';

export interface TranslationResponseFormat {
  success: boolean;
  message: string;
  data: {
    translation: SanitizedTranslationResult;
  };
}

export interface TranslationHistoryResponseFormat {
  success: boolean;
  data: {
    translations: SanitizedTranslationResult[];
  };
}

@Controller('translation')
@UseGuards(JwtAuthGuard)
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async translateText(
    @Body() translateDto: TranslateDto,
    @Request() req: any,
  ): Promise<TranslationResponseFormat> {
    const userId = req.user.id;
    const result = await this.translationService.translateText(translateDto, userId);
    return {
      success: true,
      message: 'Translation completed successfully',
      data: {
        translation: result,
      },
    };
  }

  @Get()
  async getTranslationHistory(@Request() req: any): Promise<TranslationHistoryResponseFormat> {
    const userId = req.user.id;
    const results = await this.translationService.getUserTranslationHistory(userId);
    return {
      success: true,
      data: {
        translations: results,
      },
    };
  }
}
