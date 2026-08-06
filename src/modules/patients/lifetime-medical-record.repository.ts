import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class LifetimeMedicalRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientCore(patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        code: true,
        name: true,
        dob: true,
        gender: true,
        bloodType: true,
        phone: true,
        email: true,
        address: true,
        heightCm: true,
        weightKg: true,
        primaryDoctorId: true,
      },
    });
  }

  /** Active (non-expired) care-team row for this user, any relationship —
   * mirrors patients.repository.ts's findVisibleById doctor-visibility
   * condition, reused here to resolve "quan hệ điều trị còn hiệu lực". */
  async hasActiveCareTeamRow(patientId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.patientCareTeamMember.findFirst({
      where: {
        patientId,
        userId,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return row !== null;
  }

  findEncountersForPatient(patientId: string) {
    return this.prisma.medicalEncounter.findMany({
      where: { patientId },
      include: {
        organization: { select: { id: true, name: true } },
        clinicLocation: { select: { id: true, name: true } },
        currentDoctor: { select: { id: true, displayName: true } },
        diagnoses: true,
        clinicalPlan: true,
        clinicalOrders: { include: { result: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPrescriptions(encounterIds: string[]) {
    if (encounterIds.length === 0) return Promise.resolve([]);
    return this.prisma.prescription.findMany({ where: { encounterId: { in: encounterIds } } });
  }

  findDocuments(encounterIds: string[]) {
    if (encounterIds.length === 0) return Promise.resolve([]);
    return this.prisma.clinicalDocument.findMany({ where: { encounterId: { in: encounterIds } } });
  }

  async findUserNames(userIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((r) => [r.id, r.displayName]));
  }

  findAllergies(patientId: string) {
    return this.prisma.allergyIntolerance.findMany({
      where: { patientId },
      orderBy: [{ active: 'desc' }, { recordedAt: 'desc' }],
    });
  }

  findVitalObservations(patientId: string) {
    return this.prisma.vitalObservation.findMany({
      where: { patientId },
      // Sort by observedAt (the clinically authoritative measurement time),
      // not recordedAt (system entry time — may be later for imports/backfills).
      orderBy: { observedAt: 'desc' },
    });
  }

  findProfileNarrative(patientId: string) {
    return this.prisma.patientProfileNarrative.findUnique({
      where: { patientId },
    });
  }

  findLatestAllergyKnowledgeAssessment(patientId: string) {
    return this.prisma.allergyKnowledgeAssessment.findFirst({
      where: { patientId },
      orderBy: { assessedAt: 'desc' },
      select: {
        id: true,
        knowledgeState: true,
        assessedAt: true,
        assessedByUserId: true,
        organizationId: true,
      },
    });
  }
}
