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

  upsertNarrative(
    patientId: string,
    organizationId: string,
    data: {
      occupation?: string | null;
      chiefComplaint?: string | null;
      medicalHistory?: string | null;
      familyHistory?: string | null;
      currentSymptoms?: string | null;
      lifestyle?: string | null;
      surgicalHistory?: string | null;
      vaccinationNotes?: string | null;
    },
    updatedByUserId: string,
  ) {
    return this.prisma.patientProfileNarrative.upsert({
      where: { patientId },
      create: { patientId, organizationId, ...data, updatedByUserId },
      update: { ...data, updatedByUserId, version: { increment: 1 } },
    });
  }

  findProblemList(patientId: string) {
    return this.prisma.patientProblemListEntry.findMany({
      where: { patientId },
      include: { addedBy: { select: { id: true, displayName: true } } },
      orderBy: [{ status: 'asc' }, { addedAt: 'desc' }],
    });
  }

  createProblemEntry(
    patientId: string,
    organizationId: string,
    addedByUserId: string,
    data: {
      conditionName: string;
      conditionCode?: string | null;
      status?: string;
      onsetDate?: string | null;
      severity?: string | null;
      note?: string | null;
    },
  ) {
    return this.prisma.patientProblemListEntry.create({
      data: {
        patientId,
        organizationId,
        addedByUserId,
        conditionName: data.conditionName,
        conditionCode: data.conditionCode ?? null,
        status: data.status ?? 'active',
        onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
        severity: data.severity ?? null,
        note: data.note ?? null,
      },
      include: { addedBy: { select: { id: true, displayName: true } } },
    });
  }

  updateProblemEntry(
    id: string,
    data: {
      conditionName?: string;
      conditionCode?: string | null;
      status?: string;
      onsetDate?: string | null;
      severity?: string | null;
      note?: string | null;
    },
  ) {
    return this.prisma.patientProblemListEntry.update({
      where: { id },
      data: {
        ...data,
        onsetDate:
          data.onsetDate !== undefined
            ? data.onsetDate
              ? new Date(data.onsetDate)
              : null
            : undefined,
      },
      include: { addedBy: { select: { id: true, displayName: true } } },
    });
  }

  findProblemEntry(id: string) {
    return this.prisma.patientProblemListEntry.findUnique({
      where: { id },
      select: { id: true, patientId: true },
    });
  }

  findCurrentMedications(patientId: string) {
    return this.prisma.patientCurrentMedication.findMany({
      where: { patientId },
      include: { addedBy: { select: { id: true, displayName: true } } },
      orderBy: [{ active: 'desc' }, { addedAt: 'desc' }],
    });
  }

  createCurrentMedication(
    patientId: string,
    organizationId: string,
    addedByUserId: string,
    data: {
      medicationName: string;
      dosage?: string | null;
      frequency?: string | null;
      route?: string | null;
      startedAt?: string | null;
      note?: string | null;
    },
  ) {
    return this.prisma.patientCurrentMedication.create({
      data: {
        patientId,
        organizationId,
        addedByUserId,
        medicationName: data.medicationName,
        dosage: data.dosage ?? null,
        frequency: data.frequency ?? null,
        route: data.route ?? null,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        note: data.note ?? null,
      },
      include: { addedBy: { select: { id: true, displayName: true } } },
    });
  }

  updateCurrentMedication(
    id: string,
    data: {
      medicationName?: string;
      dosage?: string | null;
      frequency?: string | null;
      route?: string | null;
      startedAt?: string | null;
      note?: string | null;
      active?: boolean;
    },
  ) {
    return this.prisma.patientCurrentMedication.update({
      where: { id },
      data: {
        ...data,
        startedAt:
          data.startedAt !== undefined
            ? data.startedAt
              ? new Date(data.startedAt)
              : null
            : undefined,
      },
      include: { addedBy: { select: { id: true, displayName: true } } },
    });
  }

  findCurrentMedication(id: string) {
    return this.prisma.patientCurrentMedication.findUnique({
      where: { id },
      select: { id: true, patientId: true },
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
