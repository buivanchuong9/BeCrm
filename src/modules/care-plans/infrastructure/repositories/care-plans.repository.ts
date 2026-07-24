import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';

interface CreateFollowUpActivityInput {
  carePlanId: string;
  type: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: string;
  status: string;
  automationMode?: string;
  automationAction?: string;
}

@Injectable()
export class CarePlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.crmCarePlan.findUnique({ where: { id } });
  }

  findLatestForPatient(patientId: string) {
    return this.prisma.crmCarePlan.findFirst({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(patientId: string, encounterId: string) {
    return this.prisma.crmCarePlan.create({ data: { patientId, encounterId } });
  }

  listActivities(carePlanId: string) {
    return this.prisma.followUpActivity.findMany({
      where: { carePlanId },
      orderBy: { dueDate: 'asc' },
    });
  }

  createActivity(input: CreateFollowUpActivityInput) {
    return this.prisma.followUpActivity.create({ data: input });
  }

  findActivityById(id: string) {
    return this.prisma.followUpActivity.findUnique({ where: { id } });
  }

  updateActivityStatus(id: string, status: string, versionIncrement: number) {
    return this.prisma.followUpActivity.update({
      where: { id },
      data: { status, version: { increment: versionIncrement } },
    });
  }

  /** Optimistic-concurrency transition for `POST
   * /follow-up-activities/{id}/transitions`: the `version`+`status` guard in
   * `where` means the update only lands if nobody else moved the card first;
   * `count === 0` tells the caller to raise 409 CONCURRENCY_CONFLICT. */
  transitionActivityStatus(id: string, fromStatus: string, toStatus: string, version: number) {
    return this.prisma.followUpActivity.updateMany({
      where: { id, status: fromStatus, version },
      data: { status: toStatus, version: { increment: 1 } },
    });
  }

  findAutomationCandidates(carePlanId: string) {
    return this.prisma.followUpActivity.findMany({
      where: { carePlanId, status: { in: ['scheduled', 'due'] } },
    });
  }

  /** Applies the automation run's status transition (due -> completed,
   * scheduled unchanged) plus automation bookkeeping, then returns the
   * updated rows for the response payload. */
  async applyAutomationRun(dueIds: string[], scheduledIds: string[]) {
    const now = new Date();
    if (dueIds.length) {
      await this.prisma.followUpActivity.updateMany({
        where: { id: { in: dueIds } },
        data: {
          status: 'completed',
          lastAutomatedAt: now,
          automationRunCount: { increment: 1 },
          version: { increment: 1 },
        },
      });
    }
    if (scheduledIds.length) {
      await this.prisma.followUpActivity.updateMany({
        where: { id: { in: scheduledIds } },
        data: { lastAutomatedAt: now, automationRunCount: { increment: 1 } },
      });
    }
    const ids = [...dueIds, ...scheduledIds];
    if (!ids.length) return [];
    return this.prisma.followUpActivity.findMany({ where: { id: { in: ids } } });
  }
}
