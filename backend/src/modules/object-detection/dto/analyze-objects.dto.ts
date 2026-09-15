import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeObjectsDto {
  @IsNotEmpty({ message: 'imageId is required' })
  @IsString({ message: 'imageId must be a valid string' })
  imageId: string;
}
