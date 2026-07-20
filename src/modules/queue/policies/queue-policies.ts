import { UserRole } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../core/errors/app-error';

/** docs/api.md App.tsx STAFF_QUEUE_ROLES — everyone allowed to view the
 * (non-public) queue/work-queue surface. */
export const STAFF_QUEUE_ROLES: UserRole[] = [
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'imaging_technician',
  'pharmacist',
  'care_coordinator',
  'medical_administrator',
];

/** docs/api.md App.tsx QUEUE_CONTROL_ROLES — allowed to call-next / advance a
 * ticket's status. */
export const QUEUE_CONTROL_ROLES: UserRole[] = [
  'doctor',
  'nurse',
  'receptionist',
  'medical_administrator',
];

/** docs/api.md App.tsx RECEPTION_ROLES — reception summary, kiosk device
 * registration. */
export const RECEPTION_ROLES: UserRole[] = ['receptionist', 'medical_administrator'];

function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return principal.memberships.some((m) => m.role === 'super_administrator');
}

function organizationIdsForRoles(principal: AuthenticatedPrincipal, roles: UserRole[]): string[] {
  const ids = new Set<string>();
  for (const m of principal.memberships) {
    if (roles.includes(m.role)) ids.add(m.organizationId);
  }
  return [...ids];
}

/** Returns the organization IDs the caller may view queue/reception data for,
 * or throws if the caller holds none of the required roles anywhere. Every
 * queue endpoint additionally requires an explicit `clinicLocationId` query
 * param scoped against this set — never an org-wide, cross-clinic dump
 * (docs/api.md section 22, section 7.2 clinic scope). */
export function assertQueueViewScope(
  principal: AuthenticatedPrincipal,
  roles: UserRole[],
): string[] {
  if (isSuperAdministrator(principal)) return [];
  const orgIds = organizationIdsForRoles(principal, roles);
  if (orgIds.length === 0) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot access the queue.');
  }
  return orgIds;
}

export function assertClinicInScope(
  principal: AuthenticatedPrincipal,
  roles: UserRole[],
  organizationId: string,
): void {
  if (isSuperAdministrator(principal)) return;
  const orgIds = organizationIdsForRoles(principal, roles);
  if (!orgIds.includes(organizationId)) {
    throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
  }
}
