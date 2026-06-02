import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ success: false, message }, status);
  }
}

export class NotFoundException extends DomainException {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} not found: ${id}` : `${entity} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class OptimisticLockException extends DomainException {
  constructor() {
    super(
      'Optimistic lock conflict — record was modified by another request. Reload and retry.',
      HttpStatus.CONFLICT,
    );
  }
}
