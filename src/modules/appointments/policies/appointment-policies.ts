import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../core/errors/app-error';

const ORG_WIDE_ROLES = ['receptionist', 'medical_administrator'] as const;

function hasRole(principal: AuthenticatedPrincipal, role: string): boolean {
  return principal.memberships.some((m) => m.role === role);
}

export function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return hasRole(principal, 'super_administrator');
}

function organizationIdsForRole(principal: AuthenticatedPrincipal, role: string): string[] {
  return principal.memberships.filter((m) => m.role === role).map((m) => m.organizationId);
}

/** docs/api.md APT-1: patient forced to self, doctor forced to their own
 * appointments, receptionist/medical_administrator org-wide — never an
 * arbitrary ?patientId= override from a non-staff caller. */
export type AppointmentListScope =
  | { mode: 'patient' }
  | { mode: 'doctor' }
  | { mode: 'organizations'; organizationIds: string[] }
  | { mode: 'all' };

export function resolveAppointmentListScope(
  principal: AuthenticatedPrincipal,
): AppointmentListScope {
  if (isSuperAdministrator(principal)) {
    return { mode: 'all' };
  }
  const orgWideIds = new Set<string>();
  let isOrgWideStaff = false;
  for (const role of ORG_WIDE_ROLES) {
    for (const orgId of organizationIdsForRole(principal, role)) {
      orgWideIds.add(orgId);
      isOrgWideStaff = true;
    }
  }
  if (isOrgWideStaff) {
    return { mode: 'organizations', organizationIds: [...orgWideIds] };
  }
  if (hasRole(principal, 'doctor')) {
    return { mode: 'doctor' };
  }
  if (hasRole(principal, 'patient')) {
    return { mode: 'patient' };
  }
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot list appointments.');
}

/** docs/api.md APT-3: patient (self) or receptionist (must supply
 * onBehalfOfPatientId — never trusts a bare patientId from a patient caller). */
export function assertCanBook(principal: AuthenticatedPrincipal): void {
  if (isSuperAdministrator(principal)) return;
  if (hasRole(principal, 'patient') || hasRole(principal, 'receptionist')) return;
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot book appointments.');
}

/** docs/api.md APT-4/5: cancel/reschedule — patient may only act on their own
 * appointment, receptionist may act on any appointment in their organization. */
export function assertCanModify(
  principal: AuthenticatedPrincipal,
  appointment: { patientId: string; organizationId: string },
  patientUserId: string | null,
): void {
  if (isSuperAdministrator(principal)) return;
  if (patientUserId !== null && patientUserId === principal.userId) return;
  if (organizationIdsForRole(principal, 'receptionist').includes(appointment.organizationId))
    return;
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Not authorized to modify this appointment.');
}

/** docs/api.md APT-6: only reception may mark a no-show. */
export function assertCanMarkMissed(
  principal: AuthenticatedPrincipal,
  appointment: { organizationId: string },
): void {
  if (isSuperAdministrator(principal)) return;
  if (organizationIdsForRole(principal, 'receptionist').includes(appointment.organizationId))
    return;
  throw new ForbiddenAppError(
    'AUTH_FORBIDDEN',
    'Only reception may mark an appointment as missed.',
  );
}

/** docs/api.md APT-7: token issue/reissue — same actors as cancel/reschedule. */
export function assertCanManageCheckInToken(
  principal: AuthenticatedPrincipal,
  appointment: { organizationId: string },
  patientUserId: string | null,
): void {
  assertCanModify(
    principal,
    { patientId: '', organizationId: appointment.organizationId },
    patientUserId,
  );
}

/** docs/api.md APT-8: revocation is reception-only (a patient cannot revoke
 * their own live check-in token). */
export function assertCanRevokeCheckInToken(
  principal: AuthenticatedPrincipal,
  appointment: { organizationId: string },
): void {
  if (isSuperAdministrator(principal)) return;
  if (organizationIdsForRole(principal, 'receptionist').includes(appointment.organizationId))
    return;
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Only reception may revoke a check-in token.');
}
