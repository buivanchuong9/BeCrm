import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { ForbiddenAppError } from '../errors/app-error';

function makeContext(principal: AuthenticatedPrincipal): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: principal }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function principalWithRoles(...roles: AuthenticatedPrincipal['memberships'][number]['role'][]) {
  return {
    userId: 'u1',
    email: 'a@example.test',
    displayName: 'A',
    memberships: roles.map((role) => ({
      organizationId: 'org1',
      clinicLocationId: null,
      departmentId: null,
      role,
    })),
  };
}

describe('RolesGuard', () => {
  it('allows access when no @Roles metadata is present', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(principalWithRoles('patient')))).toBe(true);
  });

  it('allows access when the actor holds one of the required roles', () => {
    const reflector = { getAllAndOverride: () => ['doctor', 'nurse'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(principalWithRoles('doctor')))).toBe(true);
  });

  it('denies access when the actor holds none of the required roles', () => {
    const reflector = { getAllAndOverride: () => ['doctor'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext(principalWithRoles('patient')))).toThrow(
      ForbiddenAppError,
    );
  });

  it('always allows super_administrator regardless of the required roles', () => {
    const reflector = { getAllAndOverride: () => ['doctor'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(principalWithRoles('super_administrator')))).toBe(true);
  });
});
