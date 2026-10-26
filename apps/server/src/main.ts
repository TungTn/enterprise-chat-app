import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  logger.log(`🚀 Enterprise Chat Backend running on: http://localhost:${port}/api`);
  logger.log(`⚡ WebSocket Gateway listening on: ws://localhost:${port}/chat`);
}

bootstrap();
