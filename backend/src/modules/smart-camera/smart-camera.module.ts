import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SmartCameraController } from './smart-camera.controller';
import { SmartCameraService } from './smart-camera.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [SmartCameraController],
  providers: [SmartCameraService],
  exports: [SmartCameraService],
})
export class SmartCameraModule {}
