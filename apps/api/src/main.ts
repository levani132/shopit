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

  // Enable CORS - support multiple origins
  const corsOrigins = process.env['CORS_ORIGIN']
    ? process.env['CORS_ORIGIN'].split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (
        corsOrigins.some(
          (allowed) =>
            origin === allowed ||
            origin.endsWith(allowed.replace('https://', '.')),
        )
      ) {
        return callback(null, true);
      }

      // For subdomains like *.shopit.ge
      if (
        corsOrigins.some((allowed) => {
          const domain = allowed.replace('https://', '').replace('http://', '');
          return origin.endsWith(`.${domain}`) || origin.includes(domain);
        })
      ) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
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
    }),
  );

  // PORT is set by cloud providers (Render, Railway, etc.) - prioritize it
  const port = process.env['PORT'] || process.env['API_PORT'] || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 ShopIt API is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
