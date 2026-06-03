import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Error code mapping: HTTP status → frontend error code
const ERROR_CODES: Record<number, number> = {
  400: 1001,
  401: 1002,
  403: 1003,
  404: 1004,
  409: 1005,
  422: 1006,
  500: 9999,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        const msg = r['message'];
        // ValidationPipe returns message as array of strings
        if (Array.isArray(msg)) {
          message = msg.join('; ');
        } else {
          message = (msg as string) || message;
        }
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Duplicate entry — record already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint violation';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database error: ${exception.code}`;
      }
      this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    }

    // Return CareFollow standard error envelope (docs.md contract)
    response.status(status).json({
      code: ERROR_CODES[status] ?? 9999,
      message,
      result: null,
    });
  }
}
