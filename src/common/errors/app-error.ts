import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface AppErrorDetail {
  field?: string;
  code: string;
  message?: string;
}

/**
 * Every deliberate domain/authorization/validation failure must be thrown as an
 * AppError (or a subclass) so the global filter can emit the stable {code,message}
 * contract instead of leaking a framework/Prisma/SQL error shape.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details: AppErrorDetail[] = [],
  ) {
    super({ code, message, details }, status);
  }
}

export class NotFoundAppError extends AppError {
  constructor(message = 'Resource not found') {
    super('RESOURCE_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictAppError extends AppError {
  constructor(code: ErrorCode | string, message: string) {
    super(code, message, HttpStatus.CONFLICT);
  }
}

export class ForbiddenAppError extends AppError {
  constructor(code: ErrorCode | string, message = 'Forbidden') {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedAppError extends AppError {
  constructor(code: ErrorCode | string, message = 'Unauthorized') {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ValidationAppError extends AppError {
  constructor(details: AppErrorDetail[], message = 'Validation failed') {
    super('VALIDATION_FAILED', message, HttpStatus.BAD_REQUEST, details);
  }
}
