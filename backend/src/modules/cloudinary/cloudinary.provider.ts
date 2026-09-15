import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get<string>('cloudinaryCloudName'),
      api_key: configService.get<string>('cloudinaryApiKey'),
      api_secret: configService.get<string>('cloudinaryApiSecret'),
    });
  },
  inject: [ConfigService],
};
