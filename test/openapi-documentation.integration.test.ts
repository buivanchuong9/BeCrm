import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureOpenApi, DOCUMENTATION_CACHE_CONTROL } from '../src/core/documentation/openapi';

const VERSION = '2.5.1';

@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get(key: string) {
          if (key === 'documentation') return { version: VERSION };
          return undefined;
        },
      },
    },
  ],
})
class DocumentationTestModule {}

describe('Swagger documentation URLs', () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof NestFactory.create>>;

  before(async () => {
    app = await NestFactory.create(DocumentationTestModule, { logger: false });
    configureOpenApi(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => app.close());

  it('serves the current Swagger UI directly at the stable /api/docs URL', async () => {
    const response = await fetch(`${baseUrl}/api/docs`, { redirect: 'manual' });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('cache-control'), DOCUMENTATION_CACHE_CONTROL);
    assert.match(await response.text(), /DermaHealth API 2\.5\.1/);
  });

  it('serves the current OpenAPI document at a stable JSON URL', async () => {
    const response = await fetch(`${baseUrl}/api/docs/openapi.json`);
    const document = (await response.json()) as { info: { version: string } };

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), DOCUMENTATION_CACHE_CONTROL);
    assert.equal(document.info.version, VERSION);
  });

  it('keeps the optional versioned documentation URL available', async () => {
    const response = await fetch(`${baseUrl}/api/docs/${VERSION}/openapi.json`);
    const document = (await response.json()) as { info: { version: string } };

    assert.equal(response.status, 200);
    assert.equal(document.info.version, VERSION);
  });
});
