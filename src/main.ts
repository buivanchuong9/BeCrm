import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/exceptions/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173').split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Selectedrole', 'Hostname'],
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Swagger (dev only)
  if (nodeEnv !== 'production') {
    app.use(['/api/docs', '/api-json'], (req: Request, res: Response, next: NextFunction) => {
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

      if (login === 'buivanchuong' && password === '123456@') {
        return next();
      }

      res.set('WWW-Authenticate', 'Basic realm="Swagger Docs"');
      res.status(401).send('Authentication required.');
    });

    const config = new DocumentBuilder()
      .setTitle('CareFollow CRM API')
      .setDescription('CareFollow Platform — Backend API Documentation')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('auth', 'Authentication & User Management')
      .addTag('customer', 'Customer Management')
      .addTag('contact', 'CRM Contact Management')
      .addTag('campaign', 'CRM Campaign Management')
      .addTag('opportunity', 'CRM Opportunity Management')
      .addTag('ticket', 'Ticket / Support Management')
      .addTag('warranty', 'Warranty Management')
      .addTag('bpm', 'BPM Workflow Engine')
      .addTag('notification', 'Notification Management')
      .addTag('employee', 'Employee & Organization')
      .addTag('health', 'Health Check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`CareFollow BE running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
