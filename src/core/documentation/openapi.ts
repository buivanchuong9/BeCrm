import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response, static as expressStatic } from 'express';
import { dirname } from 'path';
import { AppConfiguration } from '../configuration/configuration';

export const DOCUMENTATION_CACHE_CONTROL =
  'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

export interface OpenApiEndpoints {
  version: string;
  stableUiPath: string;
  stableJsonPath: string;
  versionedUiPath: string;
  versionedJsonPath: string;
}

interface HeaderWriter {
  setHeader(name: string, value: string): unknown;
}

function documentationVersion(app: INestApplication): string {
  const config = app.get(ConfigService<AppConfiguration, true>);
  return config.get('documentation', { infer: true }).version;
}

function setDocumentationNoCacheHeaders(res: HeaderWriter): void {
  res.setHeader('Cache-Control', DOCUMENTATION_CACHE_CONTROL);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function noCacheDocumentation(_req: Request, res: Response, next: NextFunction): void {
  setDocumentationNoCacheHeaders(res);
  next();
}

function registerDocumentationNoCacheHeaders(app: INestApplication): void {
  // /api/docs covers the stable UI, its document, and every versioned URL.
  // Keep the two conventional sibling endpoints no-store as well.
  app.use('/api/docs', noCacheDocumentation);
  app.use('/api/docs-json', noCacheDocumentation);
  app.use('/api/docs-yaml', noCacheDocumentation);
}

function registerDocumentationStaticAssets(app: INestApplication, uiPath: string): void {
  const assetsPath = dirname(require.resolve('swagger-ui-dist/package.json'));
  const assets = expressStatic(assetsPath, {
    index: false,
    redirect: false,
    setHeaders: setDocumentationNoCacheHeaders,
  });

  // @nestjs/swagger's built-in express.static layer overwrites Cache-Control.
  // Serving the same pinned assets first lets us enforce no-cache headers while
  // its generated HTML and swagger-ui-init.js handlers continue to work.
  app.use(uiPath, assets);
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const version = documentationVersion(app);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DermaHealth Backend API')
    .setDescription('Clinic workflow backend: identity, scheduling, clinical, workflow, EMR, CRM.')
    .setVersion(version)
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ApiErrorResponse = {
    type: 'object',
    required: ['success', 'code', 'message', 'errors', 'requestId'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      message: { type: 'string' },
      errors: { type: 'object', additionalProperties: { type: 'string' } },
      requestId: { type: 'string', format: 'uuid' },
    },
  };
  document.components.schemas.GenericSuccessEnvelope = {
    type: 'object',
    required: ['success', 'data', 'meta', 'requestId'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: {},
      meta: { type: 'object', additionalProperties: true },
      requestId: { type: 'string', format: 'uuid' },
    },
    description:
      'Fallback envelope for legacy endpoints that do not yet expose a concrete response DTO.',
  };
  const errorResponse = {
    description: 'Standard API error response',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/ApiErrorResponse' } },
    },
  };
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path ?? {})) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
      const responses = operation.responses as Record<string, unknown>;
      for (const status of [
        '400',
        '401',
        '403',
        '404',
        '405',
        '409',
        '413',
        '415',
        '422',
        '429',
        '500',
        '503',
      ]) {
        responses[status] ??= errorResponse;
      }
      for (const [status, rawResponse] of Object.entries(responses)) {
        if (!/^2\d\d$/.test(status) || status === '204' || !rawResponse) continue;
        const successResponse = rawResponse as {
          content?: Record<string, unknown>;
        };
        if (successResponse.content && Object.keys(successResponse.content).length > 0) continue;
        successResponse.content = {
          'application/json': {
            schema: { $ref: '#/components/schemas/GenericSuccessEnvelope' },
          },
        };
        (operation as Record<string, unknown>)['x-success-schema'] = 'generic-fallback';
      }
    }
  }
  return document;
}

export function configureOpenApi(app: INestApplication): OpenApiEndpoints {
  const version = documentationVersion(app);
  const stableUiPath = '/api/docs';
  const stableJsonPath = `${stableUiPath}/openapi.json`;
  const stableYamlPath = `${stableUiPath}/openapi.yaml`;
  const versionedUiPath = `${stableUiPath}/${version}`;
  const versionedJsonPath = `${versionedUiPath}/openapi.json`;
  const versionedYamlPath = `${versionedUiPath}/openapi.yaml`;
  const document = createOpenApiDocument(app);

  registerDocumentationNoCacheHeaders(app);
  registerDocumentationStaticAssets(app, versionedUiPath);

  // Register the release-specific route first so its handlers take precedence
  // over the stable UI's broader /api/docs static-assets middleware.
  SwaggerModule.setup(versionedUiPath, app, document, {
    jsonDocumentUrl: versionedJsonPath,
    yamlDocumentUrl: versionedYamlPath,
    swaggerUrl: versionedJsonPath,
    customSiteTitle: `DermaHealth API ${version}`,
  });

  // This is the URL humans should bookmark. It serves the current release
  // directly instead of redirecting the browser to a version-specific path,
  // so every deployment updates the same link. All assets and the document
  // itself are no-store, preventing an older swagger-ui-init.js from sticking.
  registerDocumentationStaticAssets(app, stableUiPath);
  SwaggerModule.setup(stableUiPath, app, document, {
    jsonDocumentUrl: stableJsonPath,
    yamlDocumentUrl: stableYamlPath,
    swaggerUrl: stableJsonPath,
    customSiteTitle: `DermaHealth API ${version}`,
  });

  return { version, stableUiPath, stableJsonPath, versionedUiPath, versionedJsonPath };
}
