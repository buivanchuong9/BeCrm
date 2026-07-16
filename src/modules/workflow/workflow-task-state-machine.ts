import { WorkflowTaskStatus } from '@prisma/client';
import { ConflictAppError } from '../../common/errors/app-error';

/** Transcribed verbatim from the source evidence's ALLOWED_TASK_TRANSITIONS
 * (docs/api.md section 28 / docs/tailieuapi.md section 5.2). */
export const ALLOWED_TASK_TRANSITIONS: Record<WorkflowTaskStatus, WorkflowTaskStatus[]> = {
  pending: ['blocked', 'ready'],
  blocked: ['ready'],
  ready: ['assigned', 'escalated'],
  assigned: ['accepted', 'escalated'],
  accepted: ['in_progress', 'escalated'],
  in_progress: [
    'waiting_for_patient',
    'waiting_for_result',
    'waiting_for_approval',
    'completed',
    'failed',
    'escalated',
  ],
  waiting_for_patient: ['in_progress', 'expired', 'escalated'],
  waiting_for_result: ['in_progress', 'failed', 'escalated'],
  waiting_for_approval: ['completed', 'rejected', 'escalated'],
  completed: [],
  failed: ['redo_required'],
  rejected: ['redo_required'],
  redo_required: ['ready', 'assigned'],
  skipped: [],
  cancelled: [],
  expired: ['ready', 'escalated'],
  escalated: ['ready', 'assigned', 'cancelled'],
};

export function canTransitionTask(from: WorkflowTaskStatus, to: WorkflowTaskStatus): boolean {
  return ALLOWED_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTaskTransitionAllowed(
  from: WorkflowTaskStatus,
  to: WorkflowTaskStatus,
): void {
  if (!canTransitionTask(from, to)) {
    throw new ConflictAppError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition workflow task from "${from}" to "${to}".`,
    );
  }
}

export const TERMINAL_TASK_STATUSES: WorkflowTaskStatus[] = ['completed', 'skipped', 'cancelled'];
