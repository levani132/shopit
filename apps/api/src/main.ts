/**
 * SellIt API Server
 * Multi-vendor e-commerce platform backend
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  const globalPrefix = process.env['API_PREFIX'] || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // PORT is set by cloud providers (Render, Railway, etc.) - prioritize it
  const port = process.env['PORT'] || process.env['API_PORT'] || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 ShopIt API is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
