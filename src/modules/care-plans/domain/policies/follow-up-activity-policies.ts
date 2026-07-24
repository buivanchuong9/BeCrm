import { ConflictAppError } from '../../../../core/errors/app-error';

/** Activity types eligible for automated reminder generation
 * (`POST /patients/{id}/care-automation-runs`) — verbatim from the
 * pre-extraction operations.service.ts constant. */
export const AUTOMATED_ACTIVITY_TYPES = new Set([
  'medication_reminder',
  'lifestyle_guidance',
  'patient_education',
  'symptom_questionnaire',
  'satisfaction_survey',
  'adherence_check',
]);

/** `POST /activities/{id}/advance` state machine — verbatim from the
 * pre-extraction operations.service.ts inline transitions map. */
const ADVANCE_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['due', 'cancelled', 'escalated'],
  due: ['completed', 'escalated', 'cancelled'],
  escalated: ['completed', 'cancelled'],
};

export function assertAdvanceTransitionAllowed(fromStatus: string, toStatus: string): void {
  if (!ADVANCE_TRANSITIONS[fromStatus]?.includes(toStatus)) {
    throw new ConflictAppError(
      'INVALID_STATE_TRANSITION',
      `${fromStatus} cannot transition to ${toStatus}.`,
    );
  }
}

/** `POST /follow-up-activities/{id}/confirmations` eligibility — only a
 * scheduled or due activity may be confirmed by the patient. */
export function assertConfirmable(status: string): void {
  if (!['scheduled', 'due'].includes(status)) {
    throw new ConflictAppError(
      'INVALID_STATE_TRANSITION',
      'Only scheduled or due activities can be confirmed.',
    );
  }
}

/** `confirmActivity`'s version-increment quirk, preserved verbatim: a
 * scheduled activity jumps by 2 (skipping the "due" transition it never
 * recorded), a due activity increments by 1. */
export function confirmVersionIncrement(fromStatus: string): number {
  return fromStatus === 'scheduled' ? 2 : 1;
}

export function isAutomationEligible(activityType: string): boolean {
  return AUTOMATED_ACTIVITY_TYPES.has(activityType);
}
