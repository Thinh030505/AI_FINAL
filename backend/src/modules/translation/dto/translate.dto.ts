import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TranslateDto {
  @IsNotEmpty({ message: 'Text for translation cannot be empty' })
  @IsString({ message: 'Text must be a valid string' })
  text: string;

  @IsOptional()
  @IsString()
  sourceLanguage?: string = 'auto';

  @IsNotEmpty({ message: 'Target language is required' })
  @IsString()
  targetLanguage: string = 'vi';
}
