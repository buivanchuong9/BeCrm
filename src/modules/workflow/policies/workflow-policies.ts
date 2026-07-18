import { UserRole } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../../common/auth/auth.types';
import { ForbiddenAppError } from '../../../common/errors/app-error';

/** docs/api.md section 27: template authoring roles; publish/archive is
 * medical_administrator-only (confirmed verbatim `assertRole` sites). */
export const TEMPLATE_AUTHOR_ROLES: UserRole[] = [
  'clinical_process_designer',
  'medical_administrator',
];
export const TEMPLATE_PUBLISH_ROLES: UserRole[] = ['medical_administrator'];

/** docs/api.md App.tsx STAFF_QUEUE_ROLES — work-queue visibility. */
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

export const WORKFLOW_ACTIVATION_ROLES: UserRole[] = ['doctor', 'medical_administrator'];
export const WORKFLOW_CANCEL_ROLES: UserRole[] = ['doctor', 'medical_administrator'];
export const TASK_REASSIGN_ROLES: UserRole[] = ['nurse', 'doctor', 'medical_administrator'];

/** No `super_administrator` bypass on either function below — authoring a
 * clinical workflow template and executing/reassigning a patient's workflow
 * task are both clinical-process authorship, not platform administration.
 * See encounter-policies.ts for the same rule applied to encounters. */
export function assertHasRole(
  principal: AuthenticatedPrincipal,
  organizationId: string,
  roles: UserRole[],
  message: string,
): void {
  const has = principal.memberships.some(
    (m) => m.organizationId === organizationId && roles.includes(m.role),
  );
  if (!has) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', message);
  }
}

/** docs/api.md section 28 / section 40 SEC-02: task actions require the
 * caller be the current assignee, or (to claim) hold the task's
 * `responsibleRole` in the encounter's organization — the frontend
 * prototype's task-execution functions have zero role checks; not
 * reproduced here. */
export function assertCanActOnTask(
  principal: AuthenticatedPrincipal,
  organizationId: string,
  responsibleRole: UserRole,
  assigneeId: string | null,
): void {
  if (assigneeId && assigneeId === principal.userId) return;
  const holdsRole = principal.memberships.some(
    (m) => m.organizationId === organizationId && m.role === responsibleRole,
  );
  if (!holdsRole) {
    throw new ForbiddenAppError(
      'AUTH_FORBIDDEN',
      'This action requires the task’s responsible role or assignment.',
    );
  }
}
