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

export interface WorkflowTerminalEdge {
  source: string;
  target: string;
}

export const WORKFLOW_START_NODE_ID = '__START__';
export const WORKFLOW_END_NODE_ID = '__END__';

export function validateTerminalEdgeShape(
  steps: WorkflowStepDefinition[],
  terminalEdges: WorkflowTerminalEdge[],
): void {
  const stepCodes = new Set(steps.map((step) => step.code));
  const seen = new Set<string>();
  for (const edge of terminalEdges) {
    const key = `${edge.source}->${edge.target}`;
    const validSource = edge.source === WORKFLOW_START_NODE_ID || stepCodes.has(edge.source);
    const validTarget = edge.target === WORKFLOW_END_NODE_ID || stepCodes.has(edge.target);
    const touchesBoundary =
      edge.source === WORKFLOW_START_NODE_ID || edge.target === WORKFLOW_END_NODE_ID;
    if (
      seen.has(key) ||
      !validSource ||
      !validTarget ||
      !touchesBoundary ||
      edge.source === edge.target ||
      edge.source === WORKFLOW_END_NODE_ID ||
      edge.target === WORKFLOW_START_NODE_ID
    ) {
      throw new ValidationAppError(
        [{ field: 'terminalEdges', code: 'VALIDATION_FAILED', message: `Invalid terminal edge "${key}".` }],
        `Invalid terminal edge "${key}".`,
      );
    }
    seen.add(key);
  }
}

export function validatePublishableWorkflowGraph(
  steps: WorkflowStepDefinition[],
  nodePositions: Record<string, { x: number; y: number }> | null,
  terminalEdges: WorkflowTerminalEdge[],
): void {
  validateStepGraph(steps);
  validateTerminalEdgeShape(steps, terminalEdges);
  const positions = nodePositions ?? {};
  if (!positions[WORKFLOW_START_NODE_ID] || !positions[WORKFLOW_END_NODE_ID]) {
    throw new ValidationAppError(
      [{ field: 'nodePositions', code: 'WORKFLOW_BOUNDARY_MISSING', message: 'Start and End nodes are required.' }],
      'Start and End nodes are required before publishing.',
    );
  }
  const roots = steps.filter((step) => step.prerequisiteStepCodes.length === 0).map((step) => step.code);
  const referenced = new Set(steps.flatMap((step) => step.prerequisiteStepCodes));
  const leaves = steps.filter((step) => !referenced.has(step.code)).map((step) => step.code);
  const startTargets = new Set(
    terminalEdges.filter((edge) => edge.source === WORKFLOW_START_NODE_ID).map((edge) => edge.target),
  );
  const endSources = new Set(
    terminalEdges.filter((edge) => edge.target === WORKFLOW_END_NODE_ID).map((edge) => edge.source),
  );
  const missingRoots = roots.filter((code) => !startTargets.has(code));
  const missingLeaves = leaves.filter((code) => !endSources.has(code));
  const invalidStartTargets = [...startTargets].filter((code) => !roots.includes(code));
  const invalidEndSources = [...endSources].filter((code) => !leaves.includes(code));
  if (missingRoots.length || missingLeaves.length || invalidStartTargets.length || invalidEndSources.length) {
    throw new ValidationAppError(
      [{
        field: 'terminalEdges',
        code: 'WORKFLOW_BOUNDARY_INCOMPLETE',
        message: `Unconnected roots: ${missingRoots.join(', ') || 'none'}; unconnected leaves: ${missingLeaves.join(', ') || 'none'}.`,
      }],
      'Every root must connect from Start and every leaf must connect to End.',
    );
  }
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
