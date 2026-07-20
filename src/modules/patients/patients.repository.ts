import { Injectable } from '@nestjs/common';
import { Patient, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { isSuperAdministrator, viewOrgWideOrganizationIds } from './policies/patient-policies';

export type PatientWithDoctor = Patient & {
  primaryDoctor: { id: string; displayName: string } | null;
};

const withPrimaryDoctor = {
  primaryDoctor: { select: { id: true, displayName: true } },
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scopes the lookup inside the query itself (never "load then filter") per
   * the architecture rule in the parent task instructions. Returns null for
   * both "does not exist" and "exists but not visible to this actor" so the
   * caller can uniformly respond 404 (IDOR-safe — spec section 11).
   */
  async findVisibleById(
    principal: AuthenticatedPrincipal,
    patientId: string,
  ): Promise<PatientWithDoctor | null> {
    if (isSuperAdministrator(principal)) {
      return this.prisma.patient.findUnique({
        where: { id: patientId },
        include: withPrimaryDoctor,
      });
    }
    const orgWideIds = viewOrgWideOrganizationIds(principal);
    return this.prisma.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          { userId: principal.userId },
          { primaryDoctorId: principal.userId },
          {
            careTeam: {
              some: {
                userId: principal.userId,
                OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
              },
            },
          },
          ...(orgWideIds.length > 0 ? [{ organizationId: { in: orgWideIds } }] : []),
        ],
      },
      include: withPrimaryDoctor,
    });
  }

  findByUserId(userId: string): Promise<PatientWithDoctor | null> {
    return this.prisma.patient.findUnique({ where: { userId }, include: withPrimaryDoctor });
  }

  /** Unscoped id->userId lookup (no visibility check) for callers that have
   * already established visibility upstream in the same request — e.g.
   * care-plans' automation run, which resolves the patient's notification
   * recipient after `CarePlanAccessService` already proved the caller can
   * see this patient. Matches the pre-extraction operations.service.ts
   * runAutomation()'s plain `prisma.patient.findUnique` exactly; does not
   * re-apply findVisibleById's scoping. */
  async findUserId(patientId: string): Promise<string | null> {
    const row = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  /** Registration-time patient row creation (docs: self-registration). Code
   * generation is a cosmetic display value, not a security/uniqueness
   * invariant beyond the `(organizationId, code)` DB constraint — a retry on
   * collision is acceptable and handled by the caller via the unique
   * constraint's ConflictAppError, same tradeoff already accepted for queue
   * ticket numbers. */
  async nextPatientCode(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const count = await tx.patient.count({ where: { organizationId } });
    return `PT-${String(1000 + count + 1)}`;
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.PatientUncheckedCreateInput,
  ): Promise<PatientWithDoctor> {
    return tx.patient.create({ data, include: withPrimaryDoctor });
  }

  async listSelf(userId: string): Promise<PatientWithDoctor[]> {
    const patient = await this.findByUserId(userId);
    return patient ? [patient] : [];
  }

  async listForOrganizations(params: {
    organizationIds: string[] | null; // null => no organization restriction (super_administrator)
    page: number;
    limit: number;
    search?: string;
    primaryDoctorId?: string;
  }): Promise<{ rows: PatientWithDoctor[]; total: number }> {
    const where: Prisma.PatientWhereInput = {
      ...(params.organizationIds ? { organizationId: { in: params.organizationIds } } : {}),
      ...(params.primaryDoctorId ? { primaryDoctorId: params.primaryDoctorId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        include: withPrimaryDoctor,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.patient.count({ where }),
    ]);
    return { rows, total };
  }

  /** Active (non-terminal) appointment/encounter/care-plan counts feed
   * PatientDetailResponse; those modules don't exist yet (T06/T08/T15), so
   * these are hardcoded to zero/null for now — never fabricated non-zero
   * values. Revisit once the owning modules ship. */
  detailProjectionPlaceholders() {
    return { activeAppointmentCount: 0, activeEncounterId: null, activeCarePlanId: null };
  }

  /** Upserts the 'primary_doctor' care-team row atomically with a
   * primaryDoctorId reassignment (called from PatientsService inside the
   * same transaction as the Patient update), so CanViewPatient's care-team
   * check stays consistent with the primaryDoctorId field. */
  async replacePrimaryDoctorCareTeamRow(
    tx: Prisma.TransactionClient,
    patientId: string,
    newDoctorId: string | null,
  ): Promise<void> {
    await tx.patientCareTeamMember.updateMany({
      where: { patientId, relationship: 'primary_doctor', endsAt: null },
      data: { endsAt: new Date() },
    });
    if (newDoctorId) {
      await tx.patientCareTeamMember.create({
        data: { patientId, userId: newDoctorId, relationship: 'primary_doctor' },
      });
    }
  }
}
