import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ImagesModule } from './modules/images/images.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { ObjectDetectionModule } from './modules/object-detection/object-detection.module';
import { ImageAnalysisModule } from './modules/image-analysis/image-analysis.module';
import { HealthModule } from './modules/health/health.module';
import { SmartCameraModule } from './modules/smart-camera/smart-camera.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUri'),
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ImagesModule,
    OcrModule,
    TranslationsModule,
    ObjectDetectionModule,
    ImageAnalysisModule,
    HealthModule,
    SmartCameraModule,
  ],
})
export class AppModule {}
