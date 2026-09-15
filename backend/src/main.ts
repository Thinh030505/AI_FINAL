import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import * as net from 'net';
import { execSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Kiểm tra xem một cổng có đang bị chiếm dụng hay không
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

/**
 * Tự động giải phóng cổng bằng cách tắt tiến trình cũ đang chiếm dụng (Windows & Unix)
 */
function freePort(port: number): boolean {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync('netstat -ano', { encoding: 'utf8' });
      const pids = new Set<number>();
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (
          (trimmed.includes(`:${port} `) || trimmed.includes(`:${port}\t`)) &&
          trimmed.includes('LISTENING')
        ) {
          const parts = trimmed.split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && !isNaN(pid) && pid !== process.pid) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
      return pids.size > 0;
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const frontendUrl = configService.get<string>('frontendUrl') || 'http://localhost:5173';

  // Enable CORS for local development
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix /api
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Tự động kiểm tra và giải phóng cổng nếu có tiến trình zombie cũ đang chiếm giữ
  if (await isPortInUse(port)) {
    logger.warn(`[EADDRINUSE] Cổng ${port} đang bị chiếm dụng. Đang tự động giải phóng...`);
    const freed = freePort(port);
    if (freed) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      logger.log(`[EADDRINUSE] Đã giải phóng cổng ${port} thành công.`);
    }
  }

  try {
    await app.listen(port);
    logger.log(`NestJS Backend Application successfully started on port ${port}`);
    logger.log(`API Health Check available at: http://localhost:${port}/api/health`);
    logger.log(`Auth APIs available at: http://localhost:${port}/api/auth/register, /login, /me`);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      logger.warn(`[EADDRINUSE] Lần thử đầu thất bại, đang thử dọn dẹp cổng ${port} và thử lại...`);
      freePort(port);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        await app.listen(port);
        logger.log(`NestJS Backend Application successfully started on port ${port} sau khi dọn dẹp`);
        return;
      } catch (retryErr: any) {
        logger.error(`[EADDRINUSE] Cổng ${port} không thể giải phóng tự động: ${retryErr.message}`);
        logger.error(`Gợi ý khắc phục: Kiểm tra hoặc tắt tiến trình đang chiếm port ${port}, hoặc đổi biến PORT trong file .env`);
      }
    } else {
      logger.error(`Lỗi khi khởi chạy máy chủ: ${error?.message || error}`);
    }
    process.exit(1);
  }
}

bootstrap();
