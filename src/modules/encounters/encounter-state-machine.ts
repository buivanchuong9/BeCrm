import { EncounterStatus, UserRole } from '@prisma/client';
import { ConflictAppError } from '../../core/errors/app-error';

/**
 * Transcribed verbatim from the frontend prototype's ENCOUNTER_TRANSITIONS
 * (docs/api.md section 23 / docs/tailieuapi.md section 5.1) — do not add or
 * remove edges without updating both documents. `follow_up_linked` is the
 * only terminal state.
 */
export const ENCOUNTER_TRANSITIONS: Record<EncounterStatus, EncounterStatus[]> = {
  registered: ['intake_in_progress'],
  intake_in_progress: ['intake_complete'],
  intake_complete: ['ai_assessed', 'under_doctor_review'],
  ai_assessed: ['routed', 'escalated', 'under_doctor_review'],
  routed: ['checked_in', 'escalated'],
  checked_in: ['under_doctor_review'],
  under_doctor_review: ['awaiting_results', 'diagnosed', 'escalated'],
  awaiting_results: ['under_doctor_review', 'diagnosed'],
  diagnosed: ['plan_approved'],
  plan_approved: ['workflow_active'],
  workflow_active: ['in_progress'],
  in_progress: ['results_complete', 'final_review'],
  results_complete: ['final_review'],
  final_review: ['discharge_ready', 'awaiting_results'],
  discharge_ready: ['record_signed'],
  record_signed: ['closed'],
  closed: ['post_visit_monitoring'],
  post_visit_monitoring: ['escalated', 'closed'],
  escalated: ['routed', 'post_visit_monitoring', 'follow_up_linked', 'under_doctor_review'],
  follow_up_linked: [],
};

const PATIENT_INTAKE_ROLES: UserRole[] = ['patient', 'nurse', 'receptionist'];
const PATIENT_SUBMIT_ROLES: UserRole[] = ['patient', 'nurse'];
const CLINICAL_STAFF_ROLES: UserRole[] = ['doctor', 'nurse', 'medical_administrator'];
const DOCTOR_ONLY: UserRole[] = ['doctor'];
const FRONT_OF_HOUSE_ROLES: UserRole[] = ['receptionist', 'nurse', 'medical_administrator'];
const RESULTS_ROLES: UserRole[] = ['doctor', 'lab_technician', 'imaging_technician'];
const WORKFLOW_ROLES: UserRole[] = ['doctor', 'nurse', 'medical_administrator'];
const ADMIN_CARE_ROLES: UserRole[] = ['medical_administrator', 'care_coordinator', 'doctor'];
const ESCALATION_ROLES: UserRole[] = ['doctor', 'nurse', 'medical_administrator'];

/**
 * docs/api.md section 23 / section 40 SEC-01: the frontend's encounterService.ts
 * has zero `assertRole` calls on any transition — this is a deliberate
 * correction, not a gap this backend reproduces. Every edge below states which
 * roles may drive it through the generic transition command; `closed` is
 * intentionally absent (unreachable via the generic endpoint — see
 * EncountersService.close, which additionally enforces the signed-record
 * precondition that this table alone cannot express).
 */
const TRANSITION_ROLES: Partial<
  Record<EncounterStatus, Partial<Record<EncounterStatus, UserRole[]>>>
> = {
  registered: { intake_in_progress: PATIENT_INTAKE_ROLES },
  intake_in_progress: { intake_complete: PATIENT_SUBMIT_ROLES },
  intake_complete: {
    ai_assessed: CLINICAL_STAFF_ROLES,
    under_doctor_review: CLINICAL_STAFF_ROLES,
  },
  ai_assessed: {
    routed: FRONT_OF_HOUSE_ROLES,
    escalated: ESCALATION_ROLES,
    under_doctor_review: CLINICAL_STAFF_ROLES,
  },
  routed: {
    checked_in: FRONT_OF_HOUSE_ROLES,
    escalated: ESCALATION_ROLES,
  },
  checked_in: { under_doctor_review: CLINICAL_STAFF_ROLES },
  under_doctor_review: {
    awaiting_results: DOCTOR_ONLY,
    diagnosed: DOCTOR_ONLY,
    escalated: ESCALATION_ROLES,
  },
  awaiting_results: {
    under_doctor_review: RESULTS_ROLES,
    diagnosed: DOCTOR_ONLY,
  },
  diagnosed: { plan_approved: DOCTOR_ONLY },
  plan_approved: { workflow_active: ['doctor', 'medical_administrator'] },
  workflow_active: { in_progress: WORKFLOW_ROLES },
  in_progress: {
    results_complete: CLINICAL_STAFF_ROLES,
    final_review: CLINICAL_STAFF_ROLES,
  },
  results_complete: { final_review: CLINICAL_STAFF_ROLES },
  final_review: {
    discharge_ready: DOCTOR_ONLY,
    awaiting_results: DOCTOR_ONLY,
  },
  discharge_ready: { record_signed: DOCTOR_ONLY },
  // record_signed -> closed: EncountersService.close() only (docs/api.md ENC-7).
  record_signed: {},
  closed: { post_visit_monitoring: ADMIN_CARE_ROLES },
  post_visit_monitoring: {
    escalated: ESCALATION_ROLES,
    closed: ['medical_administrator', 'doctor'],
  },
  escalated: {
    routed: FRONT_OF_HOUSE_ROLES,
    post_visit_monitoring: ADMIN_CARE_ROLES,
    follow_up_linked: ['medical_administrator', 'doctor'],
    under_doctor_review: CLINICAL_STAFF_ROLES,
  },
  follow_up_linked: {},
};

export function canTransition(from: EncounterStatus, to: EncounterStatus): boolean {
  return ENCOUNTER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function rolesAllowedForTransition(
  from: EncounterStatus,
  to: EncounterStatus,
): UserRole[] | undefined {
  return TRANSITION_ROLES[from]?.[to];
}

/** Throws INVALID_STATE_TRANSITION if the edge is not in ENCOUNTER_TRANSITIONS
 * (or not reachable via the generic command endpoint at all, e.g. `closed`). */
export function assertTransitionAllowed(from: EncounterStatus, to: EncounterStatus): void {
  if (!canTransition(from, to) || rolesAllowedForTransition(from, to) === undefined) {
    throw new ConflictAppError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition encounter from "${from}" to "${to}".`,
    );
  }
}
