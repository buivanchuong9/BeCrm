import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { WorkflowTaskStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { AppConfiguration } from '../../config/configuration';
import { ConflictAppError, NotFoundAppError } from '../../common/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';
import { canTransition } from '../encounters/encounter-state-machine';
import { WorkflowTemplatesRepository } from './workflow-templates.repository';
import { WorkflowRuntimeRepository } from './workflow-runtime.repository';
import {
  assertHasRole,
  assertCanActOnTask,
  WORKFLOW_ACTIVATION_ROLES,
  WORKFLOW_CANCEL_ROLES,
  TASK_REASSIGN_ROLES,
} from './policies/workflow-policies';
import { assertTaskTransitionAllowed, TERMINAL_TASK_STATUSES } from './workflow-task-state-machine';
import { WorkflowStepDefinition } from './workflow-step-graph.util';
import { computeWorkflowIntegrityHash, generateInstanceCode } from './workflow-identity.util';
import { toWorkflowInstanceResponse, toWorkflowTaskResponse } from './workflow-response.mapper';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class WorkflowRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: WorkflowTemplatesRepository,
    private readonly runtime: WorkflowRuntimeRepository,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  /**
   * docs/api.md section 28 ACT-1 — idempotent: replays the existing instance
   * if the encounter already has one (confirmed frontend behavior), rather
   * than erroring or duplicating. Requires an approved ClinicalPlan.
   * Also the integration point ClinicalPlan approval (Doctor Decision
   * module) can call into, once wired — kept as a plain injectable service
   * method rather than an event bus for simplicity.
   */
  async activate(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    templateId: string,
    context: RequestContext,
  ) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    assertHasRole(
      principal,
      encounter.organizationId,
      WORKFLOW_ACTIVATION_ROLES,
      'This role cannot activate a workflow.',
    );

    const existing = await this.runtime.findInstanceByEncounterId(encounterId);
    if (existing) {
      return { data: toWorkflowInstanceResponse(existing), replayed: true };
    }

    const clinicalPlan = await this.prisma.clinicalPlan.findUnique({ where: { encounterId } });
    if (!clinicalPlan) {
      throw new ConflictAppError(
        'CLINICAL_PLAN_REQUIRED_FOR_ACTIVATION',
        'The encounter needs an approved clinical plan before its workflow can be activated.',
      );
    }

    const template = await this.templates.findById(templateId);
    if (!template || !template.latestPublishedVersionId) {
      throw new NotFoundAppError('No published workflow template found.');
    }
    const templateVersion = await this.templates.findVersionById(template.latestPublishedVersionId);
    if (!templateVersion) {
      throw new NotFoundAppError('Published workflow template version not found.');
    }
    const steps = templateVersion.steps as unknown as WorkflowStepDefinition[];

    const instanceId = randomUUID();
    const secret = this.config.get('auth', { infer: true }).fieldEncryptionKey;
    const integrityHash = computeWorkflowIntegrityHash(secret, {
      patientId: encounter.patientId,
      encounterId,
      templateVersionId: templateVersion.id,
      instanceId,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const instance = await this.runtime.createInstance(tx, {
        id: instanceId,
        patientId: encounter.patientId,
        encounterId,
        templateId: template.id,
        templateVersionId: templateVersion.id,
        instanceCode: generateInstanceCode(),
        integrityHash,
        activatedBy: principal.userId,
        status: 'active',
      });

      await this.runtime.createTasks(
        tx,
        steps.map((step) => ({
          instanceId: instance.id,
          encounterId,
          stepCode: step.code,
          name: step.name,
          responsibleRole: step.responsibleRole,
          department: step.department,
          status: step.prerequisiteStepCodes.length === 0 ? 'ready' : 'pending',
          dependsOnStepCodes: step.prerequisiteStepCodes,
          slaMinutes: step.maxWaitingMinutes,
          priority: 'medium',
          urgency: 'routine',
          mandatory: step.mandatory,
        })),
      );

      if (canTransition(encounter.status, 'workflow_active')) {
        await tx.medicalEncounter.update({
          where: { id: encounterId },
          data: { status: 'workflow_active', version: { increment: 1 } },
        });
        // Copy-on-instantiate is followed by an immediate hand-off into
        // execution (docs section 28: "Transition encounter -> workflow_active
        // -> in_progress") — both hops applied as one row write, same pattern
        // as the AI-assessment auto-transition chain.
        if (canTransition('workflow_active', 'in_progress')) {
          await tx.medicalEncounter.update({
            where: { id: encounterId },
            data: { status: 'in_progress' },
          });
        }
      }
      await this.encounters.addEvent(
        tx,
        encounterId,
        `Quy trình vận hành "${template.name}" đã kích hoạt`,
        'success',
      );

      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_instance.activated',
          resourceType: 'workflow_instance',
          resourceId: instance.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'workflow_instance',
        aggregateId: instance.id,
        eventType: 'workflow_instance.activated',
        payload: { instanceId: instance.id, encounterId },
      });

      return instance;
    });

    return { data: toWorkflowInstanceResponse(result), replayed: false };
  }

  async getInstance(principal: AuthenticatedPrincipal, instanceId: string) {
    const instance = await this.runtime.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    const encounter = await this.encounters.findVisibleById(principal, instance.encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    return { data: toWorkflowInstanceResponse(instance) };
  }

  async verifyIdentity(principal: AuthenticatedPrincipal, instanceId: string) {
    const instance = await this.runtime.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    const encounter = await this.encounters.findVisibleById(principal, instance.encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    const secret = this.config.get('auth', { infer: true }).fieldEncryptionKey;
    const recomputed = computeWorkflowIntegrityHash(secret, {
      patientId: instance.patientId,
      encounterId: instance.encounterId,
      templateVersionId: instance.templateVersionId,
      instanceId: instance.id,
    });
    const valid = recomputed === instance.integrityHash;
    if (!valid) {
      await this.audit.write({
        actorId: principal.userId,
        action: 'workflow_instance.identity_mismatch',
        resourceType: 'workflow_instance',
        resourceId: instance.id,
        patientId: instance.patientId,
        organizationId: encounter.organizationId,
        result: 'denied',
        requestId: undefined,
      });
    }
    return { data: { valid } };
  }

  async listForPatient(_principal: AuthenticatedPrincipal, patientId: string) {
    const rows = await this.runtime.listInstancesForPatient(patientId);
    return { data: rows.map(toWorkflowInstanceResponse) };
  }

  private async loadInstance(principal: AuthenticatedPrincipal, instanceId: string) {
    const instance = await this.runtime.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    const encounter = await this.encounters.findVisibleById(principal, instance.encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Workflow instance not found.');
    }
    return { instance, encounter };
  }

  async suspend(
    principal: AuthenticatedPrincipal,
    instanceId: string,
    reason: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { instance, encounter } = await this.loadInstance(principal, instanceId);
    assertHasRole(
      principal,
      encounter.organizationId,
      ['doctor', 'nurse', 'medical_administrator'],
      'This role cannot suspend a workflow.',
    );
    if (instance.status !== 'active') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        'Only an active instance can be suspended.',
      );
    }
    const result = await this.runtime.updateInstance(
      this.prisma as never,
      instanceId,
      expectedVersion,
      {
        status: 'suspended',
        suspendedReason: reason,
      },
    );
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'The instance was modified by another request.',
      );
    }
    await this.audit.write({
      actorId: principal.userId,
      action: 'workflow_instance.suspended',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      patientId: instance.patientId,
      organizationId: encounter.organizationId,
      reason,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return {
      data: toWorkflowInstanceResponse(
        await this.runtime.findInstanceById(instanceId).then((i) => i!),
      ),
    };
  }

  async resume(
    principal: AuthenticatedPrincipal,
    instanceId: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { instance, encounter } = await this.loadInstance(principal, instanceId);
    assertHasRole(
      principal,
      encounter.organizationId,
      ['doctor', 'nurse', 'medical_administrator'],
      'This role cannot resume a workflow.',
    );
    if (instance.status !== 'suspended') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        'Only a suspended instance can be resumed.',
      );
    }
    const result = await this.runtime.updateInstance(
      this.prisma as never,
      instanceId,
      expectedVersion,
      {
        status: 'active',
        suspendedReason: null,
      },
    );
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'The instance was modified by another request.',
      );
    }
    await this.audit.write({
      actorId: principal.userId,
      action: 'workflow_instance.resumed',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      patientId: instance.patientId,
      organizationId: encounter.organizationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return {
      data: toWorkflowInstanceResponse(
        await this.runtime.findInstanceById(instanceId).then((i) => i!),
      ),
    };
  }

  async cancel(
    principal: AuthenticatedPrincipal,
    instanceId: string,
    reason: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { instance, encounter } = await this.loadInstance(principal, instanceId);
    assertHasRole(
      principal,
      encounter.organizationId,
      WORKFLOW_CANCEL_ROLES,
      'This role cannot cancel a workflow.',
    );
    if (instance.status === 'completed' || instance.status === 'cancelled') {
      throw new ConflictAppError('INVALID_STATE_TRANSITION', 'This instance is already terminal.');
    }
    const result = await this.runtime.updateInstance(
      this.prisma as never,
      instanceId,
      expectedVersion,
      {
        status: 'cancelled',
      },
    );
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'The instance was modified by another request.',
      );
    }
    await this.audit.write({
      actorId: principal.userId,
      action: 'workflow_instance.cancelled',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      patientId: instance.patientId,
      organizationId: encounter.organizationId,
      reason,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return {
      data: toWorkflowInstanceResponse(
        await this.runtime.findInstanceById(instanceId).then((i) => i!),
      ),
    };
  }

  /** docs/api.md WFI-7: completion requires every mandatory task to be
   * completed/skipped; does not auto-close the encounter (confirmed
   * frontend behavior) — it nudges toward `results_complete` only. */
  async complete(
    principal: AuthenticatedPrincipal,
    instanceId: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { instance, encounter } = await this.loadInstance(principal, instanceId);
    assertHasRole(
      principal,
      encounter.organizationId,
      ['doctor', 'nurse', 'medical_administrator'],
      'This role cannot complete a workflow.',
    );

    const tasks = await this.runtime.listTasksForInstance(instanceId);
    const unmetMandatory = tasks.filter(
      (t) => t.mandatory && !TERMINAL_TASK_STATUSES.includes(t.status),
    );
    if (unmetMandatory.length > 0) {
      throw new ConflictAppError(
        'WORKFLOW_INSTANCE_INCOMPLETE_MANDATORY_TASKS',
        `${unmetMandatory.length} mandatory task(s) are not yet completed or skipped.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.runtime.updateInstance(tx, instanceId, expectedVersion, {
        status: 'completed',
        completedAt: new Date(),
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The instance was modified by another request.',
        );
      }
      if (canTransition(encounter.status, 'results_complete')) {
        await tx.medicalEncounter.update({
          where: { id: instance.encounterId },
          data: { status: 'results_complete', version: { increment: 1 } },
        });
      }
      await this.encounters.addEvent(
        tx,
        instance.encounterId,
        'Quy trình vận hành đã hoàn tất',
        'success',
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_instance.completed',
          resourceType: 'workflow_instance',
          resourceId: instanceId,
          patientId: instance.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowInstance.findUniqueOrThrow({ where: { id: instanceId } });
    });

    return { data: toWorkflowInstanceResponse(updated) };
  }

  async listTasks(
    _principal: AuthenticatedPrincipal,
    filters: {
      encounterId?: string;
      role?: string;
      assigneeId?: string;
      department?: string;
      status?: WorkflowTaskStatus;
      priority?: string;
      urgency?: string;
    },
  ) {
    const rows = await this.runtime.list({
      encounterId: filters.encounterId,
      responsibleRole: filters.role,
      assigneeId: filters.assigneeId,
      department: filters.department,
      status: filters.status,
      priority: filters.priority,
      urgency: filters.urgency,
    });
    return { data: rows.map(toWorkflowTaskResponse) };
  }

  private async loadTaskWithEncounter(principal: AuthenticatedPrincipal, taskId: string) {
    const task = await this.runtime.findTaskById(taskId);
    if (!task) {
      throw new NotFoundAppError('Workflow task not found.');
    }
    const encounter = await this.encounters.findVisibleById(principal, task.encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Workflow task not found.');
    }
    return { task, encounter };
  }

  async claim(
    principal: AuthenticatedPrincipal,
    taskId: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { task, encounter } = await this.loadTaskWithEncounter(principal, taskId);
    assertCanActOnTask(principal, encounter.organizationId, task.responsibleRole, task.assigneeId);
    if (task.status !== 'ready') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        `Task is not ready to claim (current: ${task.status}).`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claimResult = await this.runtime.claim(tx, taskId, expectedVersion, principal.userId);
      if (claimResult.count === 0) {
        throw new ConflictAppError(
          'WORKFLOW_TASK_ALREADY_CLAIMED',
          'This task was already claimed by another staff member.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_task.claimed',
          resourceType: 'workflow_task',
          resourceId: taskId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } });
    });

    return { data: toWorkflowTaskResponse(result) };
  }

  private async transitionTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    expectedVersion: number,
    toStatus: WorkflowTaskStatus,
    context: RequestContext,
    action: string,
    extra: {
      reason?: string;
      refreshDependents?: boolean;
      extraData?: Record<string, unknown>;
    } = {},
  ) {
    const { task, encounter } = await this.loadTaskWithEncounter(principal, taskId);
    assertCanActOnTask(principal, encounter.organizationId, task.responsibleRole, task.assigneeId);
    assertTaskTransitionAllowed(task.status, toStatus);
    if (toStatus === 'skipped' && task.mandatory) {
      throw new ConflictAppError(
        'WORKFLOW_STEP_MANDATORY_CANNOT_MODIFY',
        'A mandatory task cannot be skipped.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const data: Record<string, unknown> = { status: toStatus, ...extra.extraData };
      if (toStatus === 'in_progress' && !task.startedAt) data.startedAt = now;
      if (TERMINAL_TASK_STATUSES.includes(toStatus)) data.completedAt = now;
      if (toStatus === 'redo_required') data.reworkCount = task.reworkCount + 1;

      const result = await this.runtime.transition(tx, taskId, expectedVersion, data as never);
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The task was modified by another request.',
        );
      }
      if (extra.refreshDependents) {
        await this.runtime.refreshDependentTasks(tx, task.instanceId);
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action,
          resourceType: 'workflow_task',
          resourceId: taskId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          reason: extra.reason ?? null,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } });
    });

    return { data: toWorkflowTaskResponse(updated) };
  }

  start(
    principal: AuthenticatedPrincipal,
    taskId: string,
    version: number,
    context: RequestContext,
  ) {
    return this.transitionTask(
      principal,
      taskId,
      version,
      'in_progress',
      context,
      'workflow_task.started',
    );
  }

  completeTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    version: number,
    context: RequestContext,
  ) {
    return this.transitionTask(
      principal,
      taskId,
      version,
      'completed',
      context,
      'workflow_task.completed',
      {
        refreshDependents: true,
      },
    );
  }

  async requestRedo(
    principal: AuthenticatedPrincipal,
    taskId: string,
    reason: string,
    version: number,
    context: RequestContext,
  ) {
    await this.transitionTask(
      principal,
      taskId,
      version,
      'failed',
      context,
      'workflow_task.failed',
      { reason },
    );
    const task = await this.runtime.findTaskById(taskId);
    return this.transitionTask(
      principal,
      taskId,
      task!.version,
      'redo_required',
      context,
      'workflow_task.redo_required',
      { reason },
    );
  }

  async reject(
    principal: AuthenticatedPrincipal,
    taskId: string,
    reason: string,
    version: number,
    context: RequestContext,
  ) {
    await this.transitionTask(
      principal,
      taskId,
      version,
      'rejected',
      context,
      'workflow_task.rejected',
      { reason },
    );
    const task = await this.runtime.findTaskById(taskId);
    return this.transitionTask(
      principal,
      taskId,
      task!.version,
      'redo_required',
      context,
      'workflow_task.redo_required',
      { reason },
    );
  }

  escalate(
    principal: AuthenticatedPrincipal,
    taskId: string,
    reason: string,
    version: number,
    context: RequestContext,
  ) {
    return this.transitionTask(
      principal,
      taskId,
      version,
      'escalated',
      context,
      'workflow_task.escalated',
      { reason },
    );
  }

  skip(
    principal: AuthenticatedPrincipal,
    taskId: string,
    reason: string,
    version: number,
    context: RequestContext,
  ) {
    return this.transitionTask(
      principal,
      taskId,
      version,
      'skipped',
      context,
      'workflow_task.skipped',
      {
        reason,
        refreshDependents: true,
      },
    );
  }

  async reassign(
    principal: AuthenticatedPrincipal,
    taskId: string,
    assigneeId: string,
    expectedVersion: number,
    context: RequestContext,
  ) {
    const { encounter } = await this.loadTaskWithEncounter(principal, taskId);
    assertHasRole(
      principal,
      encounter.organizationId,
      TASK_REASSIGN_ROLES,
      'This role cannot reassign a task.',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await this.runtime.transition(tx, taskId, expectedVersion, {
        assigneeId,
      } as never);
      if (updateResult.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The task was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_task.reassigned',
          resourceType: 'workflow_task',
          resourceId: taskId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } });
    });

    return { data: toWorkflowTaskResponse(result) };
  }
}
