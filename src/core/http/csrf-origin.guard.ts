import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ForbiddenAppError } from '../errors/app-error';
import { AppConfiguration } from '../configuration/configuration';
import { isAllowedOrigin } from '../../bootstrap';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Cookie-authenticated unsafe requests must originate from a trusted frontend.
 * CORS alone does not prevent a browser from sending a cross-site request, so
 * this guard supplies the CSRF boundary for refresh/logout endpoints.
 */
@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method) || !request.cookies?.[REFRESH_COOKIE_NAME]) {
      return true;
    }

    const origin = request.header('origin');
    const origins = this.config.get('frontendOrigins', { infer: true });
    const allowDevelopmentLocalhost = !this.config.get('isProduction', { infer: true });
    if (origin && isAllowedOrigin(origin, origins, allowDevelopmentLocalhost)) {
      return true;
    }

    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      'Cross-site cookie-authenticated request was rejected.',
    );
  }
}
