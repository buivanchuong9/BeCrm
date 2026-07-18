import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ForbiddenAppError, NotFoundAppError } from '../errors/app-error';

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Resolution order: per-organization override, else the flag's
   * platform-wide default. Unknown keys resolve to `false` (fail closed) —
   * callers gating a feature that was never seeded should not silently open
   * it. */
  async isEnabled(key: string, organizationId: string | null): Promise<boolean> {
    if (organizationId) {
      const override = await this.prisma.featureFlagOverride.findUnique({
        where: { featureKey_organizationId: { featureKey: key, organizationId } },
      });
      if (override) return override.enabled;
    }
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return flag?.enabledDefault ?? false;
  }

  async assertEnabled(key: string, organizationId: string | null, message?: string): Promise<void> {
    if (!(await this.isEnabled(key, organizationId))) {
      throw new ForbiddenAppError('FEATURE_DISABLED', message ?? `Feature "${key}" is disabled.`);
    }
  }

  list() {
    return this.prisma.featureFlag.findMany({
      include: { overrides: true },
      orderBy: { key: 'asc' },
    });
  }

  async setOverride(
    key: string,
    organizationId: string,
    enabled: boolean,
    updatedBy: string,
    requestContext: { requestId?: string; ip?: string; userAgent?: string },
  ) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundAppError(`Unknown feature flag "${key}".`);
    const override = await this.prisma.featureFlagOverride.upsert({
      where: { featureKey_organizationId: { featureKey: key, organizationId } },
      update: { enabled, updatedBy },
      create: { featureKey: key, organizationId, enabled, updatedBy },
    });
    await this.audit.write({
      actorId: updatedBy,
      action: 'feature_flag.override_set',
      resourceType: 'feature_flag',
      // resourceId is a @db.Uuid column — a flag's natural key (e.g.
      // "telemedicine_visits") isn't a UUID, so it goes in afterRedacted
      // instead, same as RolePermissionsService's role/permissionCode pair.
      resourceId: null,
      organizationId,
      result: 'success',
      changedFields: ['enabled'],
      afterRedacted: { key, enabled },
      requestId: requestContext.requestId ?? null,
      ip: requestContext.ip ?? null,
      userAgent: requestContext.userAgent ?? null,
    });
    return override;
  }

  async clearOverride(
    key: string,
    organizationId: string,
    actorId: string,
    requestContext: { requestId?: string; ip?: string; userAgent?: string },
  ) {
    await this.prisma.featureFlagOverride.deleteMany({
      where: { featureKey: key, organizationId },
    });
    await this.audit.write({
      actorId,
      action: 'feature_flag.override_cleared',
      resourceType: 'feature_flag',
      resourceId: null,
      organizationId,
      result: 'success',
      afterRedacted: { key },
      requestId: requestContext.requestId ?? null,
      ip: requestContext.ip ?? null,
      userAgent: requestContext.userAgent ?? null,
    });
  }
}
