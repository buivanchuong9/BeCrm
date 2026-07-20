import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { FeatureFlagsService } from '../../common/authorization/feature-flags.service';
import { FEATURE_FLAGS } from '../../common/authorization/feature-flags.catalog';
import { NotFoundAppError } from '../../core/errors/app-error';
import { MfaService } from '../identity/mfa/mfa.service';
import { RequestBreakGlassRequest } from './dto/owner-governance.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

const GRANT_TTL_MS = 30 * 60_000;

/**
 * Emergency, time-limited, MFA-gated read access to one patient's clinical
 * record for a super_administrator (Owner). This is the ONLY way an Owner
 * ever legitimately touches clinical content — see the removed
 * super_administrator bypasses in encounter/clinical-orders/medical-records
 * policies. Every grant is CRITICAL-audited (`breakGlass: true`) and that
 * audit write can never be suppressed by PlatformSecuritySetting (see
 * AuditService).
 */
@Injectable()
export class BreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async request(
    principal: AuthenticatedPrincipal,
    dto: RequestBreakGlassRequest,
    context: RequestContext,
  ) {
    await this.mfa.assertValidCode(principal.userId, dto.mfaCode);

    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }
    await this.featureFlags.assertEnabled(
      FEATURE_FLAGS.BREAK_GLASS_ACCESS,
      patient.organizationId,
      'Break-glass access is disabled for this organization.',
    );

    const grant = await this.prisma.breakGlassGrant.create({
      data: {
        granteeId: principal.userId,
        patientId: dto.patientId,
        reason: dto.reason,
        expiresAt: new Date(Date.now() + GRANT_TTL_MS),
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'break_glass.granted',
      resourceType: 'patient',
      resourceId: dto.patientId,
      patientId: dto.patientId,
      organizationId: patient.organizationId,
      result: 'success',
      reason: dto.reason,
      breakGlass: true,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return grant;
  }

  async end(principal: AuthenticatedPrincipal, grantId: string, context: RequestContext) {
    const grant = await this.prisma.breakGlassGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.granteeId !== principal.userId) {
      throw new NotFoundAppError('Break-glass grant not found.');
    }
    if (grant.status !== 'active') return grant;

    const updated = await this.prisma.breakGlassGrant.update({
      where: { id: grantId },
      data: { status: 'ended', endedAt: new Date() },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'break_glass.ended',
      resourceType: 'patient',
      resourceId: grant.patientId,
      patientId: grant.patientId,
      result: 'success',
      breakGlass: true,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return updated;
  }

  listMine(granteeId: string) {
    return this.prisma.breakGlassGrant.findMany({
      where: { granteeId },
      orderBy: { grantedAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.breakGlassGrant.findMany({ orderBy: { grantedAt: 'desc' }, take: 200 });
  }

  /** Read-path check used by clinical modules that want to let an Owner
   * through for the duration of an active, unexpired grant. */
  async hasActiveGrant(granteeId: string, patientId: string): Promise<boolean> {
    const grant = await this.prisma.breakGlassGrant.findFirst({
      where: { granteeId, patientId, status: 'active', expiresAt: { gt: new Date() } },
    });
    return !!grant;
  }
}
