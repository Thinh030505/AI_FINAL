import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class TranslateDto {
  @IsNotEmpty({ message: 'Text for translation cannot be empty' })
  @IsString({ message: 'Text must be a valid string' })
  text: string;

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'vi', 'en'], { message: 'sourceLanguage must be auto, vi, or en' })
  sourceLanguage?: string = 'auto';

  @IsNotEmpty({ message: 'Target language is required' })
  @IsString()
  @IsIn(['vi', 'en'], { message: 'targetLanguage must be vi or en' })
  targetLanguage: string = 'en';
}
