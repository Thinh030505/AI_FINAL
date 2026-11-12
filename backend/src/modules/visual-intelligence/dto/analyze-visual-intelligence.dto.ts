import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AnalyzeVisualIntelligenceDto {
  @IsNotEmpty()
  @IsString()
  imageId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.95)
  confidenceThreshold?: number;
}
