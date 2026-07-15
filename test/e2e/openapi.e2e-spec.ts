import {
  Controller,
  Get,
  INestApplication,
  Module,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../../src/bootstrap';
import { buildConfiguration } from '../../src/config/configuration';
import { validateEnv } from '../../src/config/env.validation';
import { configureOpenApi, DOCUMENTATION_CACHE_CONTROL } from '../../src/documentation/openapi';

@Controller({ path: 'routing-probe', version: '1' })
class VersionedRoutingProbeController {
  @Get()
  get() {
    return { version: 'v1' };
  }
}

@Controller('health')
class HealthProbeController {
  @Version(VERSION_NEUTRAL)
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => buildConfiguration(validateEnv(raw)),
    }),
  ],
  controllers: [VersionedRoutingProbeController, HealthProbeController],
})
class OpenApiTestModule {}

describe('OpenAPI documentation and stable routes (e2e)', () => {
  let app: INestApplication;
  let httpServer: import('http').Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [OpenApiTestModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    configureOpenApi(app);
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  function expectNoCacheHeaders(response: request.Response): void {
    expect(response.headers['cache-control']).toBe(DOCUMENTATION_CACHE_CONTROL);
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers.expires).toBe('0');
  }

  it('serves the release-versioned Swagger UI and all UI assets without caching', async () => {
    const ui = await request(httpServer).get('/api/docs/2.0.0');
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');
    expectNoCacheHeaders(ui);

    const initScript = await request(httpServer).get('/api/docs/2.0.0/swagger-ui-init.js');
    expect(initScript.status).toBe(200);
    expect(initScript.headers['content-type']).toContain('application/javascript');
    expect(initScript.text).toContain('/api/docs/2.0.0/openapi.json');
    expectNoCacheHeaders(initScript);

    const stylesheet = await request(httpServer).get('/api/docs/2.0.0/swagger-ui.css');
    expect(stylesheet.status).toBe(200);
    expectNoCacheHeaders(stylesheet);
  });

  it('serves versioned OpenAPI JSON with release metadata and no-cache headers', async () => {
    const response = await request(httpServer).get('/api/docs/2.0.0/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.info.version).toBe('2.0.0');
    expect(response.body.paths).toHaveProperty('/api/v1/routing-probe');
    expectNoCacheHeaders(response);
  });

  it('redirects the legacy Swagger URL to the current release without caching', async () => {
    const response = await request(httpServer).get('/api/docs');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/api/docs/2.0.0');
    expectNoCacheHeaders(response);

    const legacyJson = await request(httpServer).get('/api/docs-json');
    expect(legacyJson.status).toBe(200);
    expect(legacyJson.body.info.version).toBe('2.0.0');
    expectNoCacheHeaders(legacyJson);
  });

  it('does not expose the temporary docs-v2 route', async () => {
    const response = await request(httpServer).get('/api/docs-v2');
    expect(response.status).toBe(404);
  });

  it('preserves URI-v1 business routing and neutral health checks', async () => {
    const businessRoute = await request(httpServer).get('/api/v1/routing-probe');
    expect(businessRoute.status).toBe(200);
    expect(businessRoute.body.data).toEqual({ version: 'v1' });

    const health = await request(httpServer).get('/health/live');
    expect(health.status).toBe(200);
    expect(health.body.data ?? health.body).toEqual(expect.objectContaining({ status: 'ok' }));
  });
});
