import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenAppError } from '../errors/app-error';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { ROLES_KEY } from './roles.decorator';

/** super_administrator passes every *role* gate here, mirroring the
 * frontend's `hasRoleAccess` override — but this guard only proves "this
 * actor may reach this route", never "this actor may author clinical
 * content". The individual policy functions called inside each clinical
 * service (encounter-policies.assertCanTransition/CreateEncounter/
 * CloseEncounter, clinical-orders' assertAssignedRole, medical-records'
 * DOCTOR/reopen checks, workflow-policies.assertHasRole/assertCanActOnTask)
 * deliberately do NOT extend this bypass to super_administrator — an Owner
 * reaches clinical data only through BreakGlassGrant (see
 * modules/owner-governance/break-glass.service.ts), never a standing
 * permission. */
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
