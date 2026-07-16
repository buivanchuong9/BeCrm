import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { AppError } from '../errors/app-error';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { IdempotencyService } from './idempotency.service';
import { REQUIRE_IDEMPOTENCY_KEY } from './idempotency-key.decorator';

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<{ clinical: boolean } | undefined>(
      REQUIRE_IDEMPOTENCY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedPrincipal }>();
    const key = request.header(IDEMPOTENCY_KEY_HEADER);
    if (!key) {
      throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.', 400);
    }

    const principalId = request.user?.userId ?? null;
    const route = `${request.method} ${request.route?.path ?? request.path}`;
    const target = Object.values(request.params ?? {}).find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    const response = context.switchToHttp().getResponse<Response>();

    return from(
      this.idempotencyService.begin(
        {
          principalId,
          principalScope: principalId ? 'user' : 'anonymous',
          route,
          target,
          idempotencyKey: key,
          requestBody: request.body,
        },
        options.clinical,
      ),
    ).pipe(
      switchMap((outcome) => {
        if (outcome.kind === 'replay') {
          return of(outcome.body);
        }
        return next.handle().pipe(
          switchMap((result) =>
            from(
              this.idempotencyService.complete(outcome.recordId, response.statusCode, result),
            ).pipe(map(() => result)),
          ),
          catchError((error: unknown) =>
            from(this.idempotencyService.fail(outcome.recordId)).pipe(
              switchMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }
}
