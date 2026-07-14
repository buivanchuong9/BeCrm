import { AuthenticatedPrincipal, MembershipScope } from '../auth/auth.types';
import { ForbiddenAppError } from '../errors/app-error';

/**
 * Every scoped query/command must call this (or filter directly in the Prisma
 * query) rather than loading a resource and checking afterward. Returns the
 * matching membership scopes so callers can further restrict by clinic/department.
 */
export function requireOrganizationMembership(
  principal: AuthenticatedPrincipal,
  organizationId: string,
): MembershipScope[] {
  const scopes = principal.memberships.filter((m) => m.organizationId === organizationId);
  if (scopes.length === 0 && !principal.memberships.some((m) => m.role === 'super_administrator')) {
    throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
  }
  return scopes;
}

export function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return principal.memberships.some((m) => m.role === 'super_administrator');
}
