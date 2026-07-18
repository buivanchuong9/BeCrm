import { AuthenticatedPrincipal } from '../../../common/auth/auth.types';
import { ForbiddenAppError } from '../../../common/errors/app-error';

const LIST_STAFF_ROLES = ['receptionist', 'medical_administrator', 'doctor', 'nurse'] as const;
const VIEW_ORG_WIDE_ROLES = ['medical_administrator', 'receptionist'] as const;
const SELF_EDITABLE_FIELDS = ['phone', 'email', 'address'] as const;

// Every UpdatePatientRequest field except `version`; medical_administrator/
// super_administrator may set all of them (enforced by early-return below —
// the DTO's own class-validator whitelist already blocks anything outside
// this set from reaching the service layer at all).
export type PatientUpdatableField =
  'name' | 'dob' | 'gender' | 'phone' | 'email' | 'address' | 'bloodType' | 'primaryDoctorId';

function hasRole(principal: AuthenticatedPrincipal, role: string): boolean {
  return principal.memberships.some((m) => m.role === role);
}

export function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return hasRole(principal, 'super_administrator');
}

function organizationIdsForRole(principal: AuthenticatedPrincipal, role: string): string[] {
  return principal.memberships.filter((m) => m.role === role).map((m) => m.organizationId);
}

/**
 * `GET /patients` scope. Patients (with no staff role) are always forced to
 * their own single row — there is no dedicated "my patient record" endpoint
 * in docs/api.md, so the list endpoint doubles as the self-lookup path,
 * mirroring the documented "Patient list is forced to self" pattern used for
 * `GET /appointments` (see decision D-016).
 */
export type PatientListScope =
  { mode: 'self' } | { mode: 'all' } | { mode: 'organizations'; organizationIds: string[] };

export function resolvePatientListScope(principal: AuthenticatedPrincipal): PatientListScope {
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
  throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot list patients.');
}

/** Organization IDs where the principal holds a role that grants org-wide
 * patient visibility (used to build the DB-scoped `findVisible` query). */
export function viewOrgWideOrganizationIds(principal: AuthenticatedPrincipal): string[] {
  const ids = new Set<string>();
  for (const role of VIEW_ORG_WIDE_ROLES) {
    for (const orgId of organizationIdsForRole(principal, role)) ids.add(orgId);
  }
  return [...ids];
}

/**
 * Field-level write policy for `PATCH /patients/{patientId}`. Self and
 * receptionist may only touch contact fields; only medical_administrator can
 * reassign clinical/administrative fields including `primaryDoctorId`. Throws
 * (rather than silently dropping) if a disallowed field is present, so a
 * mass-assignment attempt is rejected loudly instead of appearing to succeed.
 */
export function assertUpdateFieldsAllowed(
  principal: AuthenticatedPrincipal,
  patient: { userId: string | null; organizationId: string },
  requestedFields: PatientUpdatableField[],
): void {
  // No `super_administrator` bypass — reassigning `primaryDoctorId`/
  // `bloodType` etc. is clinical/administrative patient data, not platform
  // administration (see encounter-policies.ts for the same rule).
  if (hasRole(principal, 'medical_administrator')) {
    return;
  }
  const isSelf = patient.userId !== null && patient.userId === principal.userId;
  const isReceptionistInOrg = organizationIdsForRole(principal, 'receptionist').includes(
    patient.organizationId,
  );
  if (!isSelf && !isReceptionistInOrg) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Not authorized to update this patient.');
  }
  const disallowed = requestedFields.filter(
    (field) => !(SELF_EDITABLE_FIELDS as readonly string[]).includes(field),
  );
  if (disallowed.length > 0) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      `Not authorized to update field(s): ${disallowed.join(', ')}.`,
    );
  }
}

/** `POST /patients/{id}/consent-grants` and `.../consent-withdrawals` are
 * first-person actions only — no guardian/proxy consent is evidenced by the
 * frontend and it is an explicit UNKNOWN in spec section 47, so it is not
 * implemented here. */
export function assertCanChangeConsent(
  principal: AuthenticatedPrincipal,
  patient: { userId: string | null },
): void {
  if (patient.userId !== null && patient.userId === principal.userId) {
    return;
  }
  throw new ForbiddenAppError(
    'AUTH_FORBIDDEN',
    'Only the patient may grant or withdraw their own consent.',
  );
}

export function canViewConsentReadOnly(
  principal: AuthenticatedPrincipal,
  patient: { userId: string | null; organizationId: string },
): boolean {
  if (isSuperAdministrator(principal)) return true;
  if (patient.userId !== null && patient.userId === principal.userId) return true;
  return organizationIdsForRole(principal, 'medical_administrator').includes(
    patient.organizationId,
  );
}
