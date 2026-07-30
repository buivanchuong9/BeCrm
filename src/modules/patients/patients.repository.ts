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
   * ticket numbers.
   *
   * MAX-based, not COUNT-based: `code` values aren't guaranteed contiguous —
   * deleted rows, or out-of-band seeded codes (e.g. legacy "BN-000x" rows)
   * mean the org's row count and its highest "PT-" number can diverge, so
   * `count() + 1` can land on a slot some unrelated existing row already
   * occupies. That's a *deterministic* unique-constraint collision, not a
   * transient race — retrying doesn't help because a failed insert never
   * changes the count, so every retry recomputes the exact same doomed code.
   * Taking the current max "PT-" number + 1 always lands above every
   * existing row in the org, so only a genuine concurrent insert (handled by
   * `createWithGeneratedCode`'s retry) can still collide. */
  async nextPatientCode(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX((regexp_match(code, '^PT-(\\d+)$'))[1]::int) AS max
      FROM patients
      WHERE organization_id = ${organizationId}::uuid
    `;
    const next = (rows[0]?.max ?? 1000) + 1;
    return `PT-${next}`;
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.PatientUncheckedCreateInput,
  ): Promise<PatientWithDoctor> {
    return tx.patient.create({ data, include: withPrimaryDoctor });
  }

  /** Runs `run` inside a fresh transaction seeded with a freshly-generated
   * `nextPatientCode`, retrying the *whole* transaction (not just the insert)
   * up to 3x on a `(organizationId, code)` collision. Once a statement inside
   * a Postgres transaction errors, the transaction is aborted and no further
   * statement can execute on that `tx` — so a caught P2002 can only be
   * recovered by starting over with a new code, matching the tradeoff
   * `nextPatientCode`'s doc comment already accepted (concurrent callers,
   * e.g. two `createSelf`/`registerPatient` requests in the same org, can
   * compute the same non-atomic count-based code). */
  async createWithGeneratedCode<T>(
    organizationId: string,
    run: (tx: Prisma.TransactionClient, code: string) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const code = await this.nextPatientCode(tx, organizationId);
          return run(tx, code);
        });
      } catch (err) {
        const isCodeCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          (err.meta?.target as string[] | undefined)?.some((field) => field === 'code');
        if (!isCodeCollision || attempt === maxAttempts) {
          throw err;
        }
      }
    }
    /* istanbul ignore next -- loop always returns or throws */
    throw new Error('unreachable');
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
    const normalizedSearch = params.search?.trim();
    const accountIdSearch =
      normalizedSearch &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalizedSearch,
      )
        ? [{ userId: { equals: normalizedSearch } }]
        : [];
    const where: Prisma.PatientWhereInput = {
      ...(params.organizationIds ? { organizationId: { in: params.organizationIds } } : {}),
      ...(params.primaryDoctorId ? { primaryDoctorId: params.primaryDoctorId } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' } },
              { code: { contains: normalizedSearch, mode: 'insensitive' } },
              { phone: { contains: normalizedSearch, mode: 'insensitive' } },
              ...accountIdSearch,
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

  /** Builds the patient-detail projection exclusively from persisted runtime
   * records. Empty databases naturally return 0/null; no synthetic values are
   * injected into the response. */
  async detailProjection(patientId: string) {
    const [activeAppointmentCount, activeEncounter, activeCarePlan] =
      await this.prisma.$transaction([
        this.prisma.appointment.count({
          where: { patientId, status: 'upcoming' },
        }),
        this.prisma.medicalEncounter.findFirst({
          where: { patientId, status: { notIn: ['closed', 'follow_up_linked'] } },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        }),
        this.prisma.crmCarePlan.findFirst({
          where: { patientId, status: { notIn: ['completed', 'cancelled'] } },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        }),
      ]);

    return {
      activeAppointmentCount,
      activeEncounterId: activeEncounter?.id ?? null,
      activeCarePlanId: activeCarePlan?.id ?? null,
    };
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
