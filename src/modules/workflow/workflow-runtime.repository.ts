import { Injectable } from '@nestjs/common';
import { Prisma, WorkflowInstance, WorkflowTask, WorkflowTaskStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { TERMINAL_TASK_STATUSES } from './workflow-task-state-machine';

@Injectable()
export class WorkflowRuntimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  createInstance(
    tx: Prisma.TransactionClient,
    data: Prisma.WorkflowInstanceUncheckedCreateInput,
  ): Promise<WorkflowInstance> {
    return tx.workflowInstance.create({ data });
  }

  findInstanceById(id: string): Promise<WorkflowInstance | null> {
    return this.prisma.workflowInstance.findUnique({ where: { id } });
  }

  findInstanceByEncounterId(encounterId: string): Promise<WorkflowInstance | null> {
    return this.prisma.workflowInstance.findUnique({ where: { encounterId } });
  }

  listInstancesForPatient(patientId: string): Promise<WorkflowInstance[]> {
    return this.prisma.workflowInstance.findMany({
      where: { patientId },
      orderBy: { activatedAt: 'desc' },
    });
  }

  updateInstance(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    data: Prisma.WorkflowInstanceUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowInstance.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  createTasks(
    tx: Prisma.TransactionClient,
    tasks: Prisma.WorkflowTaskUncheckedCreateInput[],
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowTask.createMany({ data: tasks });
  }

  findTaskById(id: string): Promise<WorkflowTask | null> {
    return this.prisma.workflowTask.findUnique({ where: { id } });
  }

  listTasksForInstance(instanceId: string): Promise<WorkflowTask[]> {
    return this.prisma.workflowTask.findMany({ where: { instanceId } });
  }

  list(filters: {
    /** Tenant-scoping filter — the caller (WorkflowRuntimeService.listTasks)
     * always supplies this, either as [a single caller-visible encounterId]
     * or [every encounterId within the caller's organizations]. There is no
     * "no encounterIds means all tasks platform-wide" mode here on purpose:
     * that was a confirmed IDOR (any authenticated user could list every
     * organization's workflow tasks) — see docs/module-capability-map.md's
     * security-audit findings. */
    encounterIds: string[];
    responsibleRole?: string;
    assigneeId?: string;
    department?: string;
    status?: WorkflowTaskStatus;
    priority?: string;
    urgency?: string;
  }): Promise<WorkflowTask[]> {
    const where: Prisma.WorkflowTaskWhereInput = {
      encounterId: { in: filters.encounterIds },
      ...(filters.responsibleRole ? { responsibleRole: filters.responsibleRole as never } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.department ? { department: filters.department } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority as never } : {}),
      ...(filters.urgency ? { urgency: filters.urgency as never } : {}),
    };
    return this.prisma.workflowTask.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  /** Compare-and-swap claim: only succeeds if the task is still `ready` and
   * unassigned (docs/api.md section 41 "Workflow task claim") — two
   * concurrent claims can never both win. */
  claim(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    assigneeId: string,
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowTask.updateMany({
      where: { id, version: expectedVersion, status: 'ready', assigneeId: null },
      data: { status: 'accepted', assigneeId, version: { increment: 1 } },
    });
  }

  transition(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    data: Prisma.WorkflowTaskUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowTask.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  /** docs/api.md section 28 "on completed/skipped, re-evaluate dependent
   * pending/blocked tasks" — flips a task to `ready` once all of its
   * dependsOnStepCodes are completed/skipped, else keeps/sets it `blocked`
   * with a clinicalWarning naming the unmet steps. */
  async refreshDependentTasks(tx: Prisma.TransactionClient, instanceId: string): Promise<void> {
    const tasks = await tx.workflowTask.findMany({ where: { instanceId } });
    const doneStepCodes = new Set(
      tasks.filter((t) => TERMINAL_TASK_STATUSES.includes(t.status)).map((t) => t.stepCode),
    );
    for (const task of tasks) {
      if (task.status !== 'pending' && task.status !== 'blocked') continue;
      const unmet = task.dependsOnStepCodes.filter((code) => !doneStepCodes.has(code));
      if (unmet.length === 0) {
        await tx.workflowTask.update({
          where: { id: task.id },
          data: { status: 'ready', clinicalWarning: null, version: { increment: 1 } },
        });
      } else if (unmet.length > 0 && task.status !== 'blocked') {
        await tx.workflowTask.update({
          where: { id: task.id },
          data: {
            status: 'blocked',
            clinicalWarning: `Chờ hoàn tất: ${unmet.join(', ')}`,
            version: { increment: 1 },
          },
        });
      }
    }
  }
}
