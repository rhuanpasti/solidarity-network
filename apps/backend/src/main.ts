import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createValidationException } from './common/validation/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGIN ??
    'http://localhost:4200,https://solidarity-network.rhuanpasti.workers.dev')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  expressApp.disable('x-powered-by');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationException,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Solidarity Network API')
      .setDescription(
        'REST API for managing charity programs, administrators, beneficiaries, benefits, and benefit deliveries.',
      )
      .setVersion('1.0.0')
      .addTag('Charity Programs')
      .addTag('Auth')
      .addTag('Administrators')
      .addTag('Beneficiaries')
      .addTag('Benefits')
      .addTag('Benefit Deliveries')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs-json',
      customSiteTitle: 'Solidarity Network API Docs',
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
