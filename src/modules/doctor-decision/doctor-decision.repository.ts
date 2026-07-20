import { Injectable } from '@nestjs/common';
import { ClinicalPlan, DoctorDiagnosis, DoctorReview, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class DoctorDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  createReview(
    tx: Prisma.TransactionClient,
    data: Prisma.DoctorReviewUncheckedCreateInput,
  ): Promise<DoctorReview> {
    return tx.doctorReview.create({ data });
  }

  listReviews(encounterId: string): Promise<DoctorReview[]> {
    return this.prisma.doctorReview.findMany({
      where: { encounterId },
      orderBy: { reviewedAt: 'desc' },
    });
  }

  createDiagnosis(
    tx: Prisma.TransactionClient,
    data: Prisma.DoctorDiagnosisUncheckedCreateInput,
  ): Promise<DoctorDiagnosis> {
    return tx.doctorDiagnosis.create({ data });
  }

  markRevised(tx: Prisma.TransactionClient, id: string): Promise<DoctorDiagnosis> {
    return tx.doctorDiagnosis.update({ where: { id }, data: { status: 'revised' } });
  }

  findDiagnosisById(id: string): Promise<DoctorDiagnosis | null> {
    return this.prisma.doctorDiagnosis.findUnique({ where: { id } });
  }

  listDiagnoses(encounterId: string): Promise<DoctorDiagnosis[]> {
    return this.prisma.doctorDiagnosis.findMany({
      where: { encounterId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  createClinicalPlan(
    tx: Prisma.TransactionClient,
    data: Prisma.ClinicalPlanUncheckedCreateInput,
  ): Promise<ClinicalPlan> {
    return tx.clinicalPlan.create({ data });
  }

  findClinicalPlanByEncounterId(encounterId: string): Promise<ClinicalPlan | null> {
    return this.prisma.clinicalPlan.findUnique({ where: { encounterId } });
  }
}
