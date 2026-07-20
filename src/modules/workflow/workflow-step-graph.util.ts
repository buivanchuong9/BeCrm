import { UserRole } from '@prisma/client';
import { AppError, ValidationAppError } from '../../core/errors/app-error';

export interface WorkflowStepDefinition {
  code: string;
  icon?: string;
  executorType?: string;
  name: string;
  description: string;
  taskType: string;
  responsibleRole: UserRole;
  department: string;
  skill?: string;
  location?: string;
  mandatory: boolean;
  conditionalRule?: string;
  estimatedDurationMinutes: number;
  maxWaitingMinutes: number;
  skipPermission: UserRole[];
  reworkRule?: string;
  escalationRule?: string;
  notificationRule?: string;
  requiredOutput?: string;
  prerequisiteStepCodes: string[];
}

/**
 * docs/api.md section 27 WFT-9/WFT-12: reject self-reference, reject a
 * prerequisite code that doesn't exist among the steps, and DFS-detect
 * cycles across the whole graph — confirmed frontend business rules
 * (`assertAcyclic`), transcribed as one bulk-validation pass since this
 * backend exposes step editing as a single PUT of the full array rather than
 * granular per-step endpoints (see schema.prisma's WorkflowTemplateVersion
 * comment for the rationale).
 */
export function validateStepGraph(steps: WorkflowStepDefinition[]): void {
  const codes = new Set<string>();
  for (const step of steps) {
    if (codes.has(step.code)) {
      throw new ValidationAppError(
        [
          {
            field: 'steps',
            code: 'VALIDATION_FAILED',
            message: `Duplicate step code "${step.code}".`,
          },
        ],
        `Duplicate step code "${step.code}".`,
      );
    }
    codes.add(step.code);
  }

  for (const step of steps) {
    if (step.prerequisiteStepCodes.includes(step.code)) {
      throw new ValidationAppError(
        [
          {
            field: 'steps',
            code: 'VALIDATION_FAILED',
            message: `Step "${step.code}" cannot depend on itself.`,
          },
        ],
        `Step "${step.code}" cannot depend on itself.`,
      );
    }
    for (const prereq of step.prerequisiteStepCodes) {
      if (!codes.has(prereq)) {
        throw new ValidationAppError(
          [
            {
              field: 'steps',
              code: 'VALIDATION_FAILED',
              message: `Unknown prerequisite step code "${prereq}".`,
            },
          ],
          `Unknown prerequisite step code "${prereq}".`,
        );
      }
    }
  }

  const graph = new Map(steps.map((s) => [s.code, s.prerequisiteStepCodes]));
  const state = new Map<string, 'visiting' | 'done'>();
  const path: string[] = [];

  function visit(code: string): void {
    const status = state.get(code);
    if (status === 'done') return;
    if (status === 'visiting') {
      throw new AppError(
        'WORKFLOW_CYCLE_DETECTED',
        `Step dependencies form a cycle: ${[...path, code].join(' -> ')}.`,
        422,
        [{ field: 'steps', code: 'WORKFLOW_CYCLE_DETECTED' }],
      );
    }
    state.set(code, 'visiting');
    path.push(code);
    for (const prereq of graph.get(code) ?? []) {
      visit(prereq);
    }
    path.pop();
    state.set(code, 'done');
  }

  for (const code of graph.keys()) {
    visit(code);
  }
}

/** docs/api.md WFT-10: a mandatory step cannot be removed from the graph
 * (generalized from the granular DELETE endpoint to a bulk-replace diff). */
export function assertNoMandatoryStepRemoved(
  previousSteps: WorkflowStepDefinition[],
  nextSteps: WorkflowStepDefinition[],
): void {
  const nextCodes = new Set(nextSteps.map((s) => s.code));
  for (const step of previousSteps) {
    if (step.mandatory && !nextCodes.has(step.code)) {
      throw new AppError(
        'WORKFLOW_STEP_MANDATORY_CANNOT_MODIFY',
        `Step "${step.code}" is mandatory and cannot be removed.`,
        409,
        [{ field: 'steps', code: 'WORKFLOW_STEP_MANDATORY_CANNOT_MODIFY' }],
      );
    }
  }
}
