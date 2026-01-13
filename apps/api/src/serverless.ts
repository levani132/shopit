/**
 * Serverless entry point for Vercel deployment
 */
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import express from 'express';

const server = express();

let cachedApp: express.Express | null = null;

async function bootstrap(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Enable cookie parsing
  app.use(cookieParser());

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
        enableImplicitConversion: false,
      },
    }),
  );

  await app.init();
  cachedApp = server;
  return server;
}

// Export the handler for Vercel
export default async function handler(req: express.Request, res: express.Response) {
  const app = await bootstrap();
  app(req, res);
}

// Also export for direct use
export { bootstrap };

