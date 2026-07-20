import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { createOpenApiDocument } from '../src/core/documentation/openapi';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
  configureApp(app);

  const document = createOpenApiDocument(app);

  const outDir = join(__dirname, '..', 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));

  // eslint-disable-next-line no-console
  console.log(
    `OpenAPI document written to docs/openapi.json (${Object.keys(document.paths).length} paths)`,
  );

  await app.close();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
