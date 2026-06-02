import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * CareFollow Standard Response Envelope
 * FE contract: { code: 0, message: "Success", result: <payload> }
 * code === 0  → success
 * code !== 0  → error (handled by HttpExceptionFilter)
 */
export interface CfApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, CfApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<CfApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'Success',
        result: data,
      })),
    );
  }
}
