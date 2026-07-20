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

  findAutomationCandidates(carePlanId: string) {
    return this.prisma.followUpActivity.findMany({
      where: { carePlanId, status: { in: ['scheduled', 'due'] } },
    });
  }

  markActivitiesAutomated(ids: string[]) {
    return this.prisma.followUpActivity.updateMany({
      where: { id: { in: ids } },
      data: { lastAutomatedAt: new Date(), automationRunCount: { increment: 1 } },
    });
  }
}
