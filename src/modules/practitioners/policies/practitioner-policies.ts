import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../core/errors/app-error';

/** Only the practitioner themself, a medical_administrator of the assignment's
 * organization, or a super_administrator may edit working hours / leave for a
 * clinic assignment. */
export function assertCanManageSchedule(
  principal: AuthenticatedPrincipal,
  assignment: { organizationId: string; practitionerUserId: string },
): void {
  if (principal.memberships.some((m) => m.role === 'super_administrator')) return;
  if (principal.userId === assignment.practitionerUserId) return;
  if (
    principal.memberships.some(
      (m) => m.role === 'medical_administrator' && m.organizationId === assignment.organizationId,
    )
  )
    return;
  throw new ForbiddenAppError(
    'AUTH_FORBIDDEN',
    'This role cannot manage this practitioner schedule.',
  );
}
