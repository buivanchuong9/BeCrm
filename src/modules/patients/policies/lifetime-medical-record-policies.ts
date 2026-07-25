import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../core/errors/app-error';

function hasRole(principal: AuthenticatedPrincipal, role: string): boolean {
  return principal.memberships.some((m) => m.role === role);
}

export function isSuperAdministrator(principal: AuthenticatedPrincipal): boolean {
  return hasRole(principal, 'super_administrator');
}

export function isDoctorRole(principal: AuthenticatedPrincipal): boolean {
  return hasRole(principal, 'doctor');
}

function isMedicalAdministratorInOrg(
  principal: AuthenticatedPrincipal,
  organizationId: string,
): boolean {
  return principal.memberships.some(
    (m) => m.role === 'medical_administrator' && m.organizationId === organizationId,
  );
}

/**
 * LIFETIME_MEDICAL_RECORD_API.md section 2: patient (self), doctor (assigned
 * + active treatment relationship), medical_administrator (org scope).
 * Deliberately narrower than patient-policies.ts's viewOrgWideOrganizationIds
 * — `receptionist` is excluded here because this endpoint returns full
 * clinical history (diagnoses, prescriptions, documents), not the
 * administrative/contact fields a receptionist legitimately needs.
 * `hasActiveDoctorRelationship` must be resolved by the caller (a DB check:
 * primaryDoctorId match or an unexpired PatientCareTeamMember row) since
 * that requires a query this pure function can't make.
 */
export function assertCanViewLifetimeRecord(
  principal: AuthenticatedPrincipal,
  patient: { userId: string | null; organizationId: string },
  hasActiveDoctorRelationship: boolean,
): void {
  if (isSuperAdministrator(principal)) return;
  if (patient.userId !== null && patient.userId === principal.userId) return;
  if (isMedicalAdministratorInOrg(principal, patient.organizationId)) return;
  if (isDoctorRole(principal) && hasActiveDoctorRelationship) return;
  throw new ForbiddenAppError(
    'RECORD_ACCESS_DENIED',
    'Not authorized to view this patient’s lifetime medical record.',
  );
}
