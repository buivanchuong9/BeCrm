import { Injectable } from '@nestjs/common';
import { AIPreliminaryAssessment, Prisma, SymptomIntake } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AiAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  createIntake(
    tx: Prisma.TransactionClient,
    data: Prisma.SymptomIntakeUncheckedCreateInput,
  ): Promise<SymptomIntake> {
    return tx.symptomIntake.create({ data });
  }

  createAssessment(
    tx: Prisma.TransactionClient,
    data: Prisma.AIPreliminaryAssessmentUncheckedCreateInput,
  ): Promise<AIPreliminaryAssessment> {
    return tx.aIPreliminaryAssessment.create({ data });
  }

  supersede(
    tx: Prisma.TransactionClient,
    priorAssessmentId: string,
    newAssessmentId: string,
  ): Promise<AIPreliminaryAssessment> {
    return tx.aIPreliminaryAssessment.update({
      where: { id: priorAssessmentId },
      data: { supersededById: newAssessmentId },
    });
  }

  /** Latest (by generatedAt) non-superseded assessment for the encounter —
   * the one a reassessment must supersede. */
  findLatestForEncounter(encounterId: string): Promise<AIPreliminaryAssessment | null> {
    return this.prisma.aIPreliminaryAssessment.findFirst({
      where: { encounterId, supersededById: null },
      orderBy: { generatedAt: 'desc' },
    });
  }

  findById(id: string): Promise<AIPreliminaryAssessment | null> {
    return this.prisma.aIPreliminaryAssessment.findUnique({ where: { id } });
  }

  listForEncounter(encounterId: string): Promise<AIPreliminaryAssessment[]> {
    return this.prisma.aIPreliminaryAssessment.findMany({
      where: { encounterId },
      orderBy: { generatedAt: 'desc' },
    });
  }
}
