import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SuccessEnvelope } from './response.types';

/**
 * Wraps every successful controller return value in the {data,meta,requestId}
 * envelope. Controllers may return {data, meta} to override meta (pagination
 * cursors etc.); anything else becomes the whole `data` payload.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((result) => {
        const requestId = request.requestId ?? 'unknown';
        if (result && typeof result === 'object' && 'data' in (result as object)) {
          const withMeta = result as unknown as { data: T; meta?: Record<string, unknown> };
          return { data: withMeta.data, meta: withMeta.meta ?? {}, requestId };
        }
        return { data: result, meta: {}, requestId };
      }),
    );
  }
}
