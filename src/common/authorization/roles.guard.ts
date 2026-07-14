import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenAppError } from '../errors/app-error';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { ROLES_KEY } from './roles.decorator';

/** super_administrator passes every role gate, mirroring the frontend's
 * `hasRoleAccess` override — but unlike the frontend, this alone never grants
 * clinical-content access (see BREAK_GLASS policy for that). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedPrincipal }>();
    const principal = request.user;
    const heldRoles = new Set(principal.memberships.map((m) => m.role));

    if (heldRoles.has('super_administrator')) {
      return true;
    }
    if (required.some((role) => heldRoles.has(role))) {
      return true;
    }

    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      `This action requires one of roles [${required.join(', ')}].`,
    );
  }
}
