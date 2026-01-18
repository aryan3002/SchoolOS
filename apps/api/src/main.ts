/**
 * SchoolOS API Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') ?? [];
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-District-ID', 'X-Request-ID'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global prefix (without version since versioning adds it)
  // app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('API_PORT') ?? 3001;
  const host = configService.get<string>('API_HOST') ?? '0.0.0.0';

  await app.listen(port, host);

  console.log(`🚀 SchoolOS API running on http://${host}:${port}`);
  console.log(`   Environment: ${configService.get<string>('NODE_ENV') ?? 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start SchoolOS API:', err);
  process.exit(1);
});
