import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { ErrorEnvelope } from './response.types';

/**
 * Single choke point that turns every thrown error (AppError, NestJS HttpException,
 * Prisma error, or unknown) into the stable {error:{code,message,details,requestId}}
 * {success:false,code,message,errors,requestId} contract. Never forwards stack
 * traces, SQL text, or Prisma internals to clients.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId ?? 'unknown';

    const { status, code, message, details } = this.resolve(exception);

    const logContext = `requestId=${requestId} method=${request.method} path=${request.originalUrl} status=${status} code=${code} exception=${exception instanceof Error ? exception.name : typeof exception} errorMessage=${message}`;
    if (status >= 500) {
      this.logger.error(logContext, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(logContext);
    }

    const body: ErrorEnvelope = {
      success: false,
      code,
      message,
      errors: this.toFieldErrors(details),
      requestId,
    };
    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: Array<{ field?: string; code: string; message?: string }>;
  } {
    if (exception instanceof AppError) {
      const body = exception.getResponse() as {
        code: string;
        message: string;
        details: Array<{ field?: string; code: string; message?: string }>;
      };
      return {
        status: exception.getStatus(),
        code: body.code === 'VALIDATION_FAILED' ? 'VALIDATION_ERROR' : body.code,
        message: body.message,
        details: body.details ?? [],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] }).message ?? exception.message);
      const details =
        typeof raw === 'object' && Array.isArray((raw as { message?: unknown }).message)
          ? ((raw as { message: string[] }).message.map((m) => ({
              code: 'VALIDATION_FAILED',
              message: m,
            })) as Array<{ field?: string; code: string; message?: string }>)
          : [];
      return {
        status,
        code: this.httpStatusToCode(status),
        message: Array.isArray(message) ? 'Validation failed' : message,
        details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'The resource already exists.',
          details: [],
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
          details: [],
        };
      }
      if (['P2000', 'P2003', 'P2011', 'P2012', 'P2019', 'P2020'].includes(exception.code)) {
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'The request contains a value that cannot be accepted.',
          details: [],
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
    };
  }

  private httpStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'AUTH_SESSION_EXPIRED';
      case HttpStatus.FORBIDDEN:
        return 'AUTH_FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'METHOD_NOT_ALLOWED';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'UNSUPPORTED_MEDIA_TYPE';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'DEPENDENCY_UNAVAILABLE';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
    }
  }

  private toFieldErrors(
    details: Array<{ field?: string; code: string; message?: string }>,
  ): Record<string, string> {
    return details.reduce<Record<string, string>>((errors, detail) => {
      if (
        detail.field &&
        (errors[detail.field] === undefined || /required/i.test(detail.message ?? ''))
      ) {
        errors[detail.field] = detail.message ?? 'The provided value is invalid.';
      }
      return errors;
    }, {});
  }
}
