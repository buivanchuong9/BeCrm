import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * CareFollow Standard Response Envelope
 * FE contract: { code: 0, message: "Success", result: <payload> }
 * code === 0  → success
 * code !== 0  → error (handled by HttpExceptionFilter)
 *
 * For paginated results (docs.md), top-level total/totalCount/recordsTotal/recordsFiltered
 * are mirrored from result so legacy FE code that reads response.total still works.
 */
export interface CfApiResponse<T> {
  code: number;
  message: string;
  result: T;
  success?: boolean;
  // legacy top-level fields mirrored from result when paginated
  total?: number;
  totalCount?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
}

function isPaged(data: unknown): data is { total: number; totalCount?: number } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'items' in (data as object) &&
    'total' in (data as object)
  );
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, CfApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<CfApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const base: CfApiResponse<T> = {
          code: 0,
          message: 'Success',
          result: data,
        };

        // Mirror top-level pagination fields expected by some FE list components
        if (isPaged(data)) {
          const total = (data as Record<string, number>).total ?? 0;
          base.total = total;
          base.totalCount = total;
          base.recordsTotal = total;
          base.recordsFiltered = total;
        }

        return base;
      }),
    );
  }
}
