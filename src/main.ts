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

  // Swagger Setup (Protected by Custom Login to avoid Nginx 401 interception)
  app.use(['/api/docs', '/api-json', '/api/docs-json'], (req: Request, res: Response, next: NextFunction) => {
    const authCookie = req.cookies['swagger-auth'];
    if (authCookie === 'valid') {
      return next();
    }

    const user = (req.body?.username || req.query?.username || '').toString().trim();
    const pass = (req.body?.password || req.query?.password || '').toString().trim();

    if (user === 'buivanchuong' && pass === '123456@') {
      res.cookie('swagger-auth', 'valid', { maxAge: 86400000, path: '/' });
      return res.redirect('/api/docs');
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Swagger Login</title></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f2f5;font-family:sans-serif;margin:0;">
        <form method="GET" action="/api/docs" style="background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);width:300px;">
          <h2 style="margin-top:0;text-align:center;color:#333;">CareFollow API</h2>
          <p style="color:red;font-size:13px;text-align:center;${user || pass ? 'display:block;' : 'display:none;'}">Sai tài khoản hoặc mật khẩu!</p>
          <div style="margin-bottom:1rem;">
            <input type="text" name="username" placeholder="Username" required style="width:100%;padding:0.75rem;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;" />
          </div>
          <div style="margin-bottom:1rem;">
            <input type="password" name="password" placeholder="Password" required style="width:100%;padding:0.75rem;border:1px solid #d9d9d9;border-radius:4px;box-sizing:border-box;" />
          </div>
          <button type="submit" style="width:100%;padding:0.75rem;background:#1890ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Login to Docs</button>
        </form>
      </body>
      </html>
    `);
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

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`CareFollow BE running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
