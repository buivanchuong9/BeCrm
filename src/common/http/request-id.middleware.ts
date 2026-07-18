import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

declare module 'express' {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER);
    const loggerRequestId = (req as Request & { id?: string }).id;
    const requestId = loggerRequestId ?? createRequestId(incoming);
    (req as Request & { id?: string }).id = requestId;
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}

export function createRequestId(incoming?: string): string {
  return incoming && isUuidLike(incoming) ? incoming : randomUUID();
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f-]{8,64}$/i.test(value);
}
