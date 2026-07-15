import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfiguration } from './config/configuration';
import { configureOpenApi } from './documentation/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  configureApp(app);
  configureOpenApi(app);

  const config = app.get(ConfigService<AppConfiguration, true>);

  const port = config.get('port', { infer: true });
  await app.listen(port);
}

bootstrap();
