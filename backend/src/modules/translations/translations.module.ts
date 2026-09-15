import { Module } from '@nestjs/common';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [TranslationModule],
  exports: [TranslationModule],
})
export class TranslationsModule {}
