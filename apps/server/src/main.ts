import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const corsOrigins = (configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());

  const isDev = process.env.NODE_ENV !== 'production';

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: isDev ? true : corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Attach Redis IO Adapter for horizontal multi-instance scaling
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(
    configService.get<string>('REDIS_HOST') || 'localhost',
    configService.get<number>('REDIS_PORT') || 6379,
    configService.get<string>('REDIS_PASSWORD') || undefined,
  );
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(port);
  logger.log(`🚀 Enterprise Chat Backend running on: http://localhost:${port}/api`);
  logger.log(`⚡ WebSocket Gateway listening on: ws://localhost:${port}/chat`);
}

bootstrap();
