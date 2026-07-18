import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { firstValueFrom, of } from 'rxjs';
import '../src/common/http/request-id.middleware';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';

describe('ResponseInterceptor', () => {
  it('does not wrap Server-Sent Events in the JSON API envelope', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(SSE_METADATA, true, handler);
    const event = { type: 'queue.snapshot', data: { waiting: 2 } };
    const context = {
      getHandler: () => handler,
    } as unknown as ExecutionContext;
    const next = { handle: () => of(event) } as CallHandler<typeof event>;

    const result = await firstValueFrom(
      new ResponseInterceptor<typeof event>().intercept(context, next),
    );

    assert.deepEqual(result, event);
  });
});
