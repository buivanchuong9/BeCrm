import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { ValidationError } from 'class-validator';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { ResponseInterceptor } from './common/http/response.interceptor';
import { ValidationAppError } from './common/errors/app-error';
import { AppConfiguration } from './config/configuration';
import { RejectBlankStringsPipe } from './common/http/reject-blank-strings.pipe';
import { RequestIdMiddleware } from './common/http/request-id.middleware';

/**
 * Shared between main.ts and the e2e test harness so tests exercise the exact
 * same middleware/pipe/filter/interceptor stack as production, not a hand-rolled
 * approximation that could hide contract bugs.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<AppConfiguration, true>);

  const requestIdMiddleware = new RequestIdMiddleware();
  const trustProxyHops = config.get('trustProxyHops', { infer: true });
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.use(helmet());
  app.use(json({ limit: config.get('requestBodyLimit', { infer: true }) }));
  app.use(urlencoded({ extended: true, limit: config.get('requestBodyLimit', { infer: true }) }));
  app.use(cookieParser());
  const configuredOrigins = config.get('frontendOrigins', { infer: true });
  const allowDevelopmentLocalhost = !config.get('isProduction', { infer: true });
  app.enableCors({
    origin: (origin, callback) =>
      callback(
        null,
        !origin || isAllowedOrigin(origin, configuredOrigins, allowDevelopmentLocalhost),
      ),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-CSRF-Token',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => {
        const details = flattenValidationErrors(errors);
        return new ValidationAppError(details, details[0]?.message ?? 'Request validation failed.');
      },
    }),
    new RejectBlankStringsPipe(),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}

export function isAllowedOrigin(
  origin: string,
  configuredOrigins: readonly string[],
  allowDevelopmentLocalhost: boolean,
): boolean {
  if (configuredOrigins.includes(origin)) return true;
  if (!allowDevelopmentLocalhost) return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Array<{ field: string; code: string; message: string }> {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      code: 'VALIDATION_ERROR',
      message,
    }));
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
