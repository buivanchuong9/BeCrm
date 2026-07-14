import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { ResponseInterceptor } from './common/http/response.interceptor';
import { ValidationAppError } from './common/errors/app-error';
import { AppConfiguration } from './config/configuration';

/**
 * Shared between main.ts and the e2e test harness so tests exercise the exact
 * same middleware/pipe/filter/interceptor stack as production, not a hand-rolled
 * approximation that could hide contract bugs.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<AppConfiguration, true>);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('frontendOrigins', { infer: true }),
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map((message) => ({
            field: error.property,
            code: 'VALIDATION_FAILED',
            message,
          })),
        );
        return new ValidationAppError(details);
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}
