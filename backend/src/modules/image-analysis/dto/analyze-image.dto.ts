import { IsNotEmpty, IsMongoId, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class AnalyzeImageDto {
  @IsNotEmpty({ message: 'imageId is required' })
  @IsMongoId({ message: 'imageId must be a valid MongoDB ObjectId' })
  imageId: string;

  @IsOptional()
  @IsIn(['auto', 'fast', 'balanced', 'accurate', 'everything'], {
    message: 'mode must be one of: auto, fast, balanced, accurate, everything',
  })
  mode?: string;

  @IsOptional()
  @IsBoolean({ message: 'forceOcr must be a boolean' })
  forceOcr?: boolean;
}
