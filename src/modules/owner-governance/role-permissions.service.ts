import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyEngineService } from '../../common/authorization/policy-engine.service';
import { NotFoundAppError } from '../../common/errors/app-error';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Runtime editor for the "Role + Permission" matrix (default shape seeded
 * from permissions.catalog.ts — see that file's doc comment for why the
 * *default* matrix is a code change, while individual grants/revokes are a
 * runtime Owner action). Every mutation invalidates PolicyEngineService's
 * cache so the change takes effect on this instance immediately.
 */
@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  list() {
    return this.prisma.rolePermission.findMany({
      include: { permission: true },
      orderBy: [{ role: 'asc' }, { permissionCode: 'asc' }],
    });
  }

  async grant(role: UserRole, permissionCode: string, grantedBy: string, context: RequestContext) {
    const permission = await this.prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!permission) throw new NotFoundAppError(`Unknown permission "${permissionCode}".`);

    const row = await this.prisma.rolePermission.upsert({
      where: { role_permissionCode: { role, permissionCode } },
      update: {},
      create: { role, permissionCode, grantedBy },
    });
    this.policyEngine.invalidate();
    await this.audit.write({
      actorId: grantedBy,
      action: 'role_permission.granted',
      resourceType: 'role_permission',
      resourceId: null,
      result: 'success',
      afterRedacted: { role, permissionCode },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return row;
  }

  async revoke(role: UserRole, permissionCode: string, revokedBy: string, context: RequestContext) {
    await this.prisma.rolePermission.deleteMany({ where: { role, permissionCode } });
    this.policyEngine.invalidate();
    await this.audit.write({
      actorId: revokedBy,
      action: 'role_permission.revoked',
      resourceType: 'role_permission',
      resourceId: null,
      result: 'success',
      afterRedacted: { role, permissionCode },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }
}
