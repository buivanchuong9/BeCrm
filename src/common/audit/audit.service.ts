import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface AuditWriteInput {
  actorId: string | null;
  actorRoleSnapshot?: string | null;
  actorNameSnapshot?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  patientId?: string | null;
  organizationId?: string | null;
  clinicLocationId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  result: 'success' | 'denied' | 'error';
  reason?: string | null;
  changedFields?: string[] | null;
  beforeRedacted?: Prisma.InputJsonValue | null;
  afterRedacted?: Prisma.InputJsonValue | null;
  breakGlass?: boolean;
}

/** Action prefixes that are never suppressed by a `disable_audit` dangerous
 * action, regardless of PlatformSecuritySetting.auditSuspendedUntil — see
 * that model's doc comment and DangerousActionsService's `disable_audit`
 * executor for why a literal "turn audit off" switch is not offered:
 * everything security/compliance/governance-relevant stays permanently
 * tamper-evident, only routine operational noise can ever be time-boxed
 * quiet. */
const NEVER_SUPPRESSED_PREFIXES = [
  'break_glass.',
  'dangerous_action.',
  'auth.mfa_',
  'feature_flag.',
  'role_permission.',
  'staff_invitation.',
  'auth.login',
  'auth.password_reset',
];

const SUSPENSION_CACHE_TTL_MS = 5_000;

/**
 * Audit rows are append-only (DB trigger in migration 0002 rejects UPDATE/DELETE).
 * `write` accepts an optional transaction client so a sensitive command can insert
 * its audit row atomically with the state change it is recording.
 */
@Injectable()
export class AuditService {
  private suspensionCache: { until: Date | null; cachedAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private isNeverSuppressed(action: string): boolean {
    return NEVER_SUPPRESSED_PREFIXES.some((prefix) => action.startsWith(prefix));
  }

  private async isSuspended(): Promise<boolean> {
    const now = Date.now();
    if (!this.suspensionCache || now - this.suspensionCache.cachedAt > SUSPENSION_CACHE_TTL_MS) {
      const setting = await this.prisma.platformSecuritySetting.findUnique({ where: { id: 1 } });
      this.suspensionCache = { until: setting?.auditSuspendedUntil ?? null, cachedAt: now };
    }
    return !!this.suspensionCache.until && this.suspensionCache.until.getTime() > now;
  }

  async write(input: AuditWriteInput, tx?: Prisma.TransactionClient): Promise<void> {
    if (!this.isNeverSuppressed(input.action) && (await this.isSuspended())) {
      return;
    }
    const client = tx ?? this.prisma;
    await client.auditEvent.create({
      data: {
        actorId: input.actorId,
        actorRoleSnap: input.actorRoleSnapshot ?? null,
        actorNameSnap: input.actorNameSnapshot ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        patientId: input.patientId ?? null,
        organizationId: input.organizationId ?? null,
        clinicLocationId: input.clinicLocationId ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        result: input.result,
        reason: input.reason ?? null,
        changedFields: input.changedFields ?? Prisma.JsonNull,
        beforeRedacted: input.beforeRedacted ?? Prisma.JsonNull,
        afterRedacted: input.afterRedacted ?? Prisma.JsonNull,
        breakGlass: input.breakGlass ?? false,
      },
    });
  }
}
