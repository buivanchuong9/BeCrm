import { Injectable } from '@nestjs/common';
import { EncounterStatus, MedicalEncounter, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { isSuperAdministrator, viewOrgWideOrganizationIds } from './policies/encounter-policies';

const CLOSED_STATUSES: EncounterStatus[] = ['closed', 'follow_up_linked'];

@Injectable()
export class EncountersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Scopes the lookup inside the query itself (never "load then filter") —
   * returns null for both "does not exist" and "exists but not visible", so
   * the caller can uniformly respond 404 (IDOR-safe, docs/api.md section 40
   * SEC-03), mirroring patients.repository.ts's findVisibleById. */
  async findVisibleById(
    principal: AuthenticatedPrincipal,
    encounterId: string,
  ): Promise<MedicalEncounter | null> {
    if (isSuperAdministrator(principal)) {
      return this.prisma.medicalEncounter.findUnique({ where: { id: encounterId } });
    }
    const orgWideIds = viewOrgWideOrganizationIds(principal);
    return this.prisma.medicalEncounter.findFirst({
      where: {
        id: encounterId,
        OR: [
          { patient: { userId: principal.userId } },
          { patient: { primaryDoctorId: principal.userId } },
          { currentDoctorId: principal.userId },
          {
            patient: {
              careTeam: {
                some: {
                  userId: principal.userId,
                  OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
                },
              },
            },
          },
          ...(orgWideIds.length > 0 ? [{ organizationId: { in: orgWideIds } }] : []),
        ],
      },
    });
  }

  async listSelf(
    patientId: string,
    filters: { status?: EncounterStatus; department?: string },
    page: number,
    limit: number,
  ): Promise<{ rows: MedicalEncounter[]; total: number }> {
    const where: Prisma.MedicalEncounterWhereInput = {
      patientId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.department ? { department: filters.department } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicalEncounter.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.medicalEncounter.count({ where }),
    ]);
    return { rows, total };
  }

  async listForOrganizations(params: {
    organizationIds: string[] | null; // null => no restriction (super_administrator)
    status?: EncounterStatus;
    department?: string;
    clinicLocationId?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: MedicalEncounter[]; total: number }> {
    const where: Prisma.MedicalEncounterWhereInput = {
      ...(params.organizationIds ? { organizationId: { in: params.organizationIds } } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.department ? { department: params.department } : {}),
      ...(params.clinicLocationId ? { clinicLocationId: params.clinicLocationId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicalEncounter.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.medicalEncounter.count({ where }),
    ]);
    return { rows, total };
  }

  /** docs/api.md ENC-4: "the one encounter driving the visit" for a patient —
   * most-recently-updated encounter that is not closed/follow_up_linked. */
  async findActiveForPatient(patientId: string): Promise<MedicalEncounter | null> {
    return this.prisma.medicalEncounter.findFirst({
      where: { patientId, status: { notIn: CLOSED_STATUSES } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Used by AppointmentsService/CRM's encounter-request approval to find the
   * parent for a follow-up encounter (docs/api.md CRR-3). */
  async findMostRecentlyUpdatedForPatient(patientId: string): Promise<MedicalEncounter | null> {
    return this.prisma.medicalEncounter.findFirst({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.MedicalEncounterUncheckedCreateInput,
  ): Promise<MedicalEncounter> {
    return tx.medicalEncounter.create({ data });
  }

  async findById(id: string): Promise<MedicalEncounter | null> {
    return this.prisma.medicalEncounter.findUnique({ where: { id } });
  }

  addEvent(
    tx: Prisma.TransactionClient,
    encounterId: string,
    label: string,
    kind: 'info' | 'warning' | 'success' | 'danger' = 'info',
  ) {
    return tx.encounterEvent.create({ data: { encounterId, label, kind } });
  }

  async listEvents(
    encounterId: string,
    limit: number,
    cursor?: { v: string; id: string },
  ): Promise<{ id: string; at: Date; label: string; kind: string }[]> {
    return this.prisma.encounterEvent.findMany({
      where: {
        encounterId,
        ...(cursor
          ? {
              OR: [
                { at: { lt: new Date(cursor.v) } },
                { at: new Date(cursor.v), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  }
}
