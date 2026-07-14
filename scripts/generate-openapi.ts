import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DermaHealth Backend API')
    .setDescription('Clinic workflow backend: identity, scheduling, clinical, workflow, EMR, CRM.')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outDir = join(__dirname, '..', 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));

  // eslint-disable-next-line no-console
  console.log(`OpenAPI document written to docs/openapi.json (${Object.keys(document.paths).length} paths)`);

  await app.close();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
