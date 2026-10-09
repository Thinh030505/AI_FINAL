import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AnalyzeFrameDto {
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frameId?: number = 1;

  @IsOptional()
  @IsString()
  @IsIn(['simple', 'detailed', 'everything'])
  mode?: string = 'everything';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1.0)
  confidenceThreshold?: number = 0.25;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  enableOcr?: boolean = false;

  @IsOptional()
  @IsString()
  targetLang?: string = 'vi';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalHeight?: number;
}
