import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfiguration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  configureApp(app);

  const config = app.get(ConfigService<AppConfiguration, true>);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DermaHealth Backend API')
    .setDescription('Clinic workflow backend: identity, scheduling, clinical, workflow, EMR, CRM.')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  SwaggerModule.setup('api/docs-v2', app, document);

  const port = config.get('port', { infer: true });
  await app.listen(port);
}

bootstrap();
