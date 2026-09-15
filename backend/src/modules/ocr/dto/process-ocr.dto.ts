import { IsNotEmpty, IsString } from 'class-validator';

export class ProcessOcrDto {
  @IsNotEmpty({ message: 'Image ID (imageId) is required' })
  @IsString({ message: 'Image ID must be a valid string' })
  imageId: string;
}
