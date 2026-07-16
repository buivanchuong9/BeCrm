import { EncounterStatus } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../../common/auth/auth.types';
import { ForbiddenAppError } from '../../../common/errors/app-error';
import { rolesAllowedForTransition } from '../encounter-state-machine';

const LIST_STAFF_ROLES = [
  'receptionist',
  'medical_administrator',
  'doctor',
  'nurse',
  'lab_technician',
  'imaging_technician',
  'pharmacist',
  'care_coordinator',
] as const;

function hasRole(principal: AuthenticatedPrincipal, role: string): boolean {
  return principal.memberships.some((m) => m.role === role);
}

export function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return hasRole(principal, 'super_administrator');
}

function organizationIdsForRole(principal: AuthenticatedPrincipal, role: string): string[] {
  return principal.memberships.filter((m) => m.role === role).map((m) => m.organizationId);
}

/** `GET /encounters` scope — mirrors patient-policies.ts's resolvePatientListScope
 * (docs/api.md section 23 ENC-1). A `patient` caller is always forced to their
 * own encounters; there is no `patientId` query override for that role
 * (docs/api.md section 40 SEC-03 — never trust a client-supplied patientId). */
export type EncounterListScope =
  { mode: 'self' } | { mode: 'all' } | { mode: 'organizations'; organizationIds: string[] };

export function resolveEncounterListScope(principal: AuthenticatedPrincipal): EncounterListScope {
  if (isSuperAdministrator(principal)) {
    return { mode: 'all' };
  }
  const staffOrgIds = new Set<string>();
  let isStaff = false;
  for (const role of LIST_STAFF_ROLES) {
    for (const orgId of organizationIdsForRole(principal, role)) {
      staffOrgIds.add(orgId);
      isStaff = true;
    }
  }
  if (isStaff) {
    return { mode: 'organizations', organizationIds: [...staffOrgIds] };
  }
  if (hasRole(principal, 'patient')) {
    return { mode: 'self' };
  }
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot list encounters.');
}

/** Organization IDs where the principal holds a role that grants org-wide
 * encounter visibility (used to build the DB-scoped `findVisible` query). */
export function viewOrgWideOrganizationIds(principal: AuthenticatedPrincipal): string[] {
  const ids = new Set<string>();
  for (const role of LIST_STAFF_ROLES) {
    for (const orgId of organizationIdsForRole(principal, role)) ids.add(orgId);
  }
  return [...ids];
}

/** Roles allowed to create a walk-in/follow-up encounter directly (docs/api.md
 * ENC-5). Appointment-origin encounters are only ever created as a side effect
 * of AppointmentsService.book — never through this endpoint. */
export function assertCanCreateEncounter(principal: AuthenticatedPrincipal): void {
  if (isSuperAdministrator(principal)) return;
  const allowed = ['receptionist', 'doctor', 'medical_administrator'];
  if (!principal.memberships.some((m) => allowed.includes(m.role))) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot create encounters.');
  }
}

/** docs/api.md section 23 / section 40 SEC-01: the generic transition command
 * additionally requires the caller to hold one of the roles the state machine
 * assigns to this specific edge — EncounterStateMachine.assertTransitionAllowed
 * only proves the edge is legal, not that this actor may drive it. */
export function assertCanTransition(
  principal: AuthenticatedPrincipal,
  from: EncounterStatus,
  to: EncounterStatus,
): void {
  if (isSuperAdministrator(principal)) return;
  const allowedRoles = rolesAllowedForTransition(from, to) ?? [];
  if (!principal.memberships.some((m) => allowedRoles.includes(m.role))) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      `Your role cannot transition an encounter from "${from}" to "${to}".`,
    );
  }
}

/** docs/api.md ENC-7: close is doctor/medical_administrator only, on top of
 * the state-machine + signed-record preconditions enforced in the service. */
export function assertCanCloseEncounter(principal: AuthenticatedPrincipal): void {
  if (isSuperAdministrator(principal)) return;
  const allowed = ['doctor', 'medical_administrator'];
  if (!principal.memberships.some((m) => allowed.includes(m.role))) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      'Only a doctor or medical administrator may close an encounter.',
    );
  }
}
