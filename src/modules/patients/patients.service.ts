import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ConflictAppError, NotFoundAppError } from '../../core/errors/app-error';
import { toOffsetPage } from '../../core/pagination/pagination.util';
import { PatientsRepository } from './patients.repository';
import { ConsentsRepository } from './consents.repository';
import {
  resolvePatientListScope,
  assertUpdateFieldsAllowed,
  PatientUpdatableField,
} from './policies/patient-policies';
import { toPatientDetailResponse, toPatientResponse } from './patient-response.mapper';
import { UpdatePatientRequest } from './dto/update-patient.dto';
import { CreateSelfPatientRequest } from './dto/create-self-patient.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsRepository,
    private readonly consents: ConsentsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    query: { page: number; limit: number; search?: string; primaryDoctorId?: string },
  ) {
    const scope = resolvePatientListScope(principal);

    if (scope.mode === 'self') {
      const rows = await this.patients.listSelf(principal.userId);
      const page = toOffsetPage(
        rows.map(toPatientResponse),
        rows.length,
        1,
        Math.max(rows.length, 1),
      );
      return { data: page.data, meta: page.meta };
    }

    const { rows, total } = await this.patients.listForOrganizations({
      organizationIds: scope.mode === 'organizations' ? scope.organizationIds : null,
      page: query.page,
      limit: query.limit,
      search: query.search,
      primaryDoctorId: query.primaryDoctorId,
    });
    const page = toOffsetPage(rows.map(toPatientResponse), total, query.page, query.limit);
    return { data: page.data, meta: page.meta };
  }

  /** docs: `GET /patients/me` — direct self-lookup for a `patient` caller,
   * avoids paginating a 1-row `GET /patients` list to find themselves. */
  async getSelf(principal: AuthenticatedPrincipal, context: RequestContext) {
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }
    return this.getDetail(principal, patient.id, context);
  }

  async updateSelf(
    principal: AuthenticatedPrincipal,
    dto: UpdatePatientRequest,
    context: RequestContext,
  ) {
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }
    return this.update(principal, patient.id, dto, context);
  }

  /** Self-service "become a patient too": lets an already-authenticated
   * staff/admin account (created via staff invitation, so it never went
   * through `RegistrationService.registerPatient`) create its own linked
   * Patient row without needing a separate anonymous-signup flow. Grants a
   * an active `patient` membership exists in the same step so `roles.includes('patient')`
   * checks elsewhere (frontend AppStateContext, resolvePatientListScope)
   * pick this account up correctly once the caller's session is refreshed —
   * the access token's membership claims are only re-derived from the DB on
   * the next `/auth/session-refreshes` call, not retroactively. */
  async createSelf(
    principal: AuthenticatedPrincipal,
    dto: CreateSelfPatientRequest,
    context: RequestContext,
  ) {
    const existing = await this.patients.findByUserId(principal.userId);
    if (existing) {
      throw new ConflictAppError('CONFLICT', 'This account already has a linked patient record.');
    }

    // Prefer the organization where the caller already holds the patient
    // role. A multi-organization staff account may have an unrelated
    // membership first in its JWT, and Patient.userId is globally unique.
    const organizationId =
      principal.memberships.find((membership) => membership.role === 'patient')?.organizationId ??
      principal.memberships[0]?.organizationId;
    if (!organizationId) {
      throw new NotFoundAppError('No organization membership found for this account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: principal.userId } });
    if (!user) {
      throw new NotFoundAppError('User not found.');
    }

    const created = await this.patients.createWithGeneratedCode(
      organizationId,
      async (tx, code) => {
        const patient = await this.patients.create(tx, {
          organizationId,
          code,
          userId: user.id,
          name: user.displayName,
          dob: new Date(`${dto.dob}T00:00:00.000Z`),
          gender: dto.gender,
          phone: dto.phone,
          email: user.email,
          address: dto.address ?? null,
          bloodType: dto.bloodType ?? 'unknown',
          heightCm: dto.heightCm ?? null,
          weightKg: dto.weightKg ?? null,
        });

        // The account may already have an active patient membership without
        // a Patient row (for example, a role was granted independently).
        // create() used to raise P2002 in that state and roll the whole
        // transaction back, leaving GET /patients/me at 404 forever.
        //
        // createMany(skipDuplicates) maps to INSERT ... ON CONFLICT DO
        // NOTHING on Postgres, so this is also safe if a concurrent role
        // assignment creates the membership between our reads.
        const membershipInsert = await tx.userMembership.createMany({
          data: [{ userId: user.id, organizationId, role: 'patient' }],
          skipDuplicates: true,
        });
        const patientMembership = await tx.userMembership.findFirstOrThrow({
          where: {
            userId: user.id,
            organizationId,
            clinicLocationId: null,
            role: 'patient',
            status: 'active',
          },
          select: { id: true },
        });

        await this.audit.write(
          {
            actorId: principal.userId,
            action: 'patient.created',
            resourceType: 'patient',
            resourceId: patient.id,
            patientId: patient.id,
            organizationId,
            result: 'success',
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );
        if (membershipInsert.count > 0) {
          await this.audit.write(
            {
              actorId: principal.userId,
              action: 'membership.created',
              resourceType: 'user_membership',
              resourceId: patientMembership.id,
              organizationId,
              result: 'success',
              requestId: context.requestId ?? null,
              ip: context.ip ?? null,
              userAgent: context.userAgent ?? null,
            },
            tx,
          );
        }

        return patient;
      },
    );

    return { data: toPatientResponse(created) };
  }

  async getDetail(principal: AuthenticatedPrincipal, patientId: string, context: RequestContext) {
    const patient = await this.patients.findVisibleById(principal, patientId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }

    const [consentRows, detailProjection] = await Promise.all([
      this.consents.listByPatientId(patientId),
      this.patients.detailProjection(patientId),
    ]);

    await this.audit.write({
      actorId: principal.userId,
      action: 'patient.read',
      resourceType: 'patient',
      resourceId: patient.id,
      patientId: patient.id,
      organizationId: patient.organizationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return {
      data: toPatientDetailResponse(patient, {
        ...detailProjection,
        consentSummary: consentRows.map((c) => ({
          type: c.type,
          granted: c.granted,
          policyVersion: c.policyVersion,
        })),
      }),
    };
  }

  async update(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: UpdatePatientRequest,
    context: RequestContext,
  ) {
    const patient = await this.patients.findVisibleById(principal, patientId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }

    // Explicit per-field undefined checks, not Object.keys(dto): with
    // `target: ES2022` (native class-field semantics), every declared
    // optional field on the DTO class becomes an own `undefined` property on
    // construction, so Object.keys() would return every field the class
    // declares — not just the ones actually present in the request body.
    const requestedFields: PatientUpdatableField[] = [
      ...(dto.name !== undefined ? (['name'] as const) : []),
      ...(dto.dob !== undefined ? (['dob'] as const) : []),
      ...(dto.gender !== undefined ? (['gender'] as const) : []),
      ...(dto.phone !== undefined ? (['phone'] as const) : []),
      ...(dto.email !== undefined ? (['email'] as const) : []),
      ...(dto.address !== undefined ? (['address'] as const) : []),
      ...(dto.bloodType !== undefined ? (['bloodType'] as const) : []),
      ...(dto.heightCm !== undefined ? (['heightCm'] as const) : []),
      ...(dto.weightKg !== undefined ? (['weightKg'] as const) : []),
      ...(dto.primaryDoctorId !== undefined ? (['primaryDoctorId'] as const) : []),
    ];
    assertUpdateFieldsAllowed(principal, patient, requestedFields);

    const data: Prisma.PatientUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.dob !== undefined ? { dob: new Date(`${dto.dob}T00:00:00.000Z`) } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.bloodType !== undefined ? { bloodType: dto.bloodType } : {}),
      ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
      ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
    };
    const changedFields = Object.keys(data);
    const primaryDoctorChanged = dto.primaryDoctorId !== undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      let result = patient;
      if (Object.keys(data).length > 0 || primaryDoctorChanged) {
        const updateResult = await tx.patient.updateMany({
          where: { id: patientId, version: dto.version },
          data: {
            ...data,
            ...(primaryDoctorChanged ? { primaryDoctorId: dto.primaryDoctorId } : {}),
            version: { increment: 1 },
          },
        });
        if (updateResult.count === 0) {
          throw new ConflictAppError(
            'OPTIMISTIC_LOCK_FAILED',
            'The patient record was modified by another request.',
          );
        }
        if (primaryDoctorChanged) {
          await this.patients.replacePrimaryDoctorCareTeamRow(
            tx,
            patientId,
            dto.primaryDoctorId ?? null,
          );
        }
        result = (await tx.patient.findUniqueOrThrow({
          where: { id: patientId },
          include: { primaryDoctor: { select: { id: true, displayName: true } } },
        })) as typeof patient;
      }

      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'patient.update',
          resourceType: 'patient',
          resourceId: patientId,
          patientId,
          organizationId: patient.organizationId,
          result: 'success',
          changedFields: primaryDoctorChanged
            ? [...changedFields, 'primaryDoctorId']
            : changedFields,
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );

      return result;
    });

    return { data: toPatientResponse(updated) };
  }
}
