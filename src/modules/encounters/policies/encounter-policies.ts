import { EncounterStatus } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../core/errors/app-error';
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
 * of AppointmentsService.book — never through this endpoint.
 *
 * No `super_administrator` bypass here (unlike `resolveEncounterListScope`
 * above, which is read-only administrative visibility): creating an
 * encounter is authoring clinical activity, and per the permission model an
 * Owner never does that directly — see the removed bypass this replaced,
 * and DoctorDecisionService's identical precedent for diagnosis/plan
 * authorship. */
export function assertCanCreateEncounter(principal: AuthenticatedPrincipal): void {
  const allowed = ['receptionist', 'doctor', 'medical_administrator'];
  if (!principal.memberships.some((m) => allowed.includes(m.role))) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot create encounters.');
  }
}

/** docs/api.md section 23 / section 40 SEC-01: the generic transition command
 * additionally requires the caller to hold one of the roles the state machine
 * assigns to this specific edge — EncounterStateMachine.assertTransitionAllowed
 * only proves the edge is legal, not that this actor may drive it.
 *
 * No `super_administrator` bypass: driving an encounter's clinical state is
 * an authorship action, not platform administration — an Owner forging a
 * transition (e.g. into `record_signed`) would be indistinguishable from a
 * real clinician doing it. */
export function assertCanTransition(
  principal: AuthenticatedPrincipal,
  from: EncounterStatus,
  to: EncounterStatus,
): void {
  const allowedRoles = rolesAllowedForTransition(from, to) ?? [];
  if (!principal.memberships.some((m) => allowedRoles.includes(m.role))) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      `Your role cannot transition an encounter from "${from}" to "${to}".`,
    );
  }
}

/** docs/api.md ENC-7: close is doctor/medical_administrator only, on top of
 * the state-machine + signed-record preconditions enforced in the service.
 * No `super_administrator` bypass — same reasoning as assertCanTransition. */
export function assertCanCloseEncounter(principal: AuthenticatedPrincipal): void {
  const allowed = ['doctor', 'medical_administrator'];
  if (!principal.memberships.some((m) => allowed.includes(m.role))) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      'Only a doctor or medical administrator may close an encounter.',
    );
  }
}
