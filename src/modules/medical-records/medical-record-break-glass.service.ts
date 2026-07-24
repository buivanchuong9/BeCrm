import { Injectable } from '@nestjs/common';
import { MedicalRecordBreakGlassGrant } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ForbiddenAppError, NotFoundAppError } from '../../core/errors/app-error';
import { MfaService } from '../identity/mfa/mfa.service';

export interface CreateMedicalRecordBreakGlassGrantInput {
  reason: string;
  mfaCode: string;
}

type Context = { requestId?: string; ip?: string; userAgent?: string };

const GRANT_TTL_MS = 15 * 60_000;

/**
 * Emergency, time-limited, MFA-gated read access to ONE encounter's medical
 * record for a staff member who lacks standing visibility into it (e.g.
 * covering an ER shift). Every grant, every read made under it, and every
 * end is CRITICAL-audited under the `break_glass.` action prefix, which
 * AuditService never suppresses regardless of PlatformSecuritySetting.
 */
@Injectable()
export class MedicalRecordBreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
  ) {}

  private shape(grant: MedicalRecordBreakGlassGrant) {
    return {
      id: grant.id,
      encounterId: grant.encounterId,
      medicalRecordId: grant.medicalRecordId,
      patientId: grant.patientId,
      grantedToUserId: grant.grantedToUserId,
      reason: grant.reason,
      status: grant.status,
      grantedAt: grant.grantedAt.toISOString(),
      expiresAt: grant.expiresAt.toISOString(),
      endedAt: grant.endedAt ? grant.endedAt.toISOString() : null,
    };
  }

  async create(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    input: CreateMedicalRecordBreakGlassGrantInput,
    context: Context,
  ) {
    await this.mfa.assertValidCode(principal.userId, input.mfaCode);

    const encounter = await this.prisma.medicalEncounter.findUnique({
      where: { id: encounterId },
    });
    if (!encounter) throw new NotFoundAppError('Encounter not found.');

    const inOrganization = principal.memberships.some(
      (m) => m.organizationId === encounter.organizationId && m.role !== 'patient',
    );
    if (!inOrganization) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Not a staff member of this organization.');
    }

    const record = await this.prisma.medicalRecord.upsert({
      where: { encounterId },
      update: {},
      create: { encounterId },
    });

    const grant = await this.prisma.medicalRecordBreakGlassGrant.create({
      data: {
        encounterId,
        medicalRecordId: record.id,
        patientId: encounter.patientId,
        grantedToUserId: principal.userId,
        reason: input.reason,
        expiresAt: new Date(Date.now() + GRANT_TTL_MS),
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'break_glass.medical_record.granted',
      resourceType: 'medical_record',
      resourceId: record.id,
      patientId: encounter.patientId,
      encounterId,
      organizationId: encounter.organizationId,
      result: 'success',
      reason: input.reason,
      severity: 'critical',
      breakGlass: true,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return { data: this.shape(grant) };
  }

  async end(principal: AuthenticatedPrincipal, grantId: string, context: Context) {
    const grant = await this.prisma.medicalRecordBreakGlassGrant.findUnique({
      where: { id: grantId },
    });
    if (!grant || grant.grantedToUserId !== principal.userId) {
      throw new NotFoundAppError('Break-glass grant not found.');
    }
    if (grant.status !== 'active') {
      return { data: this.shape(grant) };
    }

    const updated = await this.prisma.medicalRecordBreakGlassGrant.update({
      where: { id: grantId },
      data: { status: 'ended', endedAt: new Date() },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'break_glass.medical_record.ended',
      resourceType: 'medical_record',
      resourceId: grant.medicalRecordId,
      patientId: grant.patientId,
      encounterId: grant.encounterId,
      result: 'success',
      severity: 'critical',
      breakGlass: true,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return { data: this.shape(updated) };
  }

  /** Read-path check for `GET /encounters/{id}/medical-record`: returns the
   * active, unexpired grant (if any) held by this user for this encounter. */
  async findActiveGrant(
    granteeId: string,
    encounterId: string,
  ): Promise<MedicalRecordBreakGlassGrant | null> {
    return this.prisma.medicalRecordBreakGlassGrant.findFirst({
      where: {
        grantedToUserId: granteeId,
        encounterId,
        status: 'active',
        expiresAt: { gt: new Date() },
      },
    });
  }

  /** Every read of a medical record made under an active grant must be
   * CRITICAL-audited — called from MedicalRecordsService.ensureDraft. */
  async auditGrantedRead(
    principal: AuthenticatedPrincipal,
    grant: MedicalRecordBreakGlassGrant,
    context: Context,
  ) {
    await this.audit.write({
      actorId: principal.userId,
      action: 'break_glass.medical_record.read',
      resourceType: 'medical_record',
      resourceId: grant.medicalRecordId,
      patientId: grant.patientId,
      encounterId: grant.encounterId,
      result: 'success',
      severity: 'critical',
      breakGlass: true,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }
}
