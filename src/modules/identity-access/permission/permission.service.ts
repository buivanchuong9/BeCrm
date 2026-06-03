import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type RequestPermissionRecord = {
  id: string;
  tenantId: string;
  sourceUserId: string;
  status: 'pending' | 'approved' | 'rejected';
  resourceCode?: string;
  action?: string;
  roleId?: string;
  note?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
};

@Injectable()
export class PermissionService {
  private readonly requestPermissions = new Map<string, RequestPermissionRecord[]>();

  constructor(private prisma: PrismaService) {}

  private requestList(tenantId: string) {
    if (!this.requestPermissions.has(tenantId)) this.requestPermissions.set(tenantId, []);
    return this.requestPermissions.get(tenantId)!;
  }

  async getResources(actor: RequestUser) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: actor.id, deletedAt: null },
      include: { role: { include: { permissions: true } } },
    });

    const permMap = new Map<string, { resourceCode: string; action: string; granted: boolean }>();
    for (const ur of userRoles) {
      for (const p of ur.role.permissions) {
        const key = `${p.resourceCode}:${p.action}`;
        permMap.set(key, { resourceCode: p.resourceCode, action: p.action, granted: true });
      }
    }

    return [...permMap.values()];
  }

  async addPermission(roleId: string, resourceCode: string, action: string, actor: RequestUser) {
    return this.prisma.rolePermission.upsert({
      where: { roleId_resourceCode_action: { roleId, resourceCode, action } },
      update: {},
      create: { tenantId: actor.tenantId, roleId, resourceCode, action, createdBy: actor.id },
    });
  }

  async removePermission(roleId: string, resourceCode: string, action: string) {
    return this.prisma.rolePermission.deleteMany({
      where: { roleId, resourceCode, action },
    });
  }

  async getDepartmentInfo(actor: RequestUser) {
    // TODO(UNKNOWN): Exact structure pending DDD_MODEL.md
    return this.prisma.department.findMany({
      where: { tenantId: actor.tenantId, deletedAt: null },
      select: { id: true, name: true, code: true, parentId: true },
    });
  }

  // ── Clone permissions from one role/department to another ──────────────────
  async clonePermissions(
    dto: { sourceRoleId?: string; targetRoleId?: string; sourceDepartmentId?: string; targetLstJteId?: string[] },
    actor: RequestUser,
  ) {
    const sourceId = dto.sourceRoleId;
    const targetId = dto.targetRoleId;
    if (!sourceId || !targetId) return { cloned: 0 };

    const sourcePerms = await this.prisma.rolePermission.findMany({ where: { roleId: sourceId } });
    let cloned = 0;
    for (const p of sourcePerms) {
      await this.prisma.rolePermission.upsert({
        where: { roleId_resourceCode_action: { roleId: targetId, resourceCode: p.resourceCode, action: p.action } },
        update: {},
        create: { tenantId: actor.tenantId, roleId: targetId, resourceCode: p.resourceCode, action: p.action, createdBy: actor.id },
      });
      cloned++;
    }
    return { cloned };
  }

  // ── RolePermission ─────────────────────────────────────────────────────────
  async getRolePermissionInfo(roleId: string) {
    const perms = await this.prisma.rolePermission.findMany({ where: { roleId } });
    return perms.map((p) => ({ resourceCode: p.resourceCode, action: p.action, granted: true }));
  }

  async addRolePermission(dto: { roleId: string; resourceCode: string; action: string }, actor: RequestUser) {
    return this.addPermission(dto.roleId, dto.resourceCode, dto.action, actor);
  }

  async removeRolePermission(dto: { roleId: string; resourceCode: string; action: string }) {
    return this.removePermission(dto.roleId, dto.resourceCode, dto.action);
  }

  // ── RequestPermission (no Prisma model — tenant in-memory workflow) ─────────
  async listRequestPermissionSource(actor: RequestUser) {
    return this.requestList(actor.tenantId).filter((r) => r.sourceUserId === actor.id);
  }

  async listRequestPermissionTarget(actor: RequestUser) {
    return this.requestList(actor.tenantId).filter((r) => r.status === 'pending');
  }

  async updateRequestPermissionStatus(id: string, status: 'approved' | 'rejected', actor: RequestUser) {
    const list = this.requestList(actor.tenantId);
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) {
      const created: RequestPermissionRecord = {
        id,
        tenantId: actor.tenantId,
        sourceUserId: actor.id,
        status,
        createdAt: new Date().toISOString(),
        approvedBy: actor.id,
        approvedAt: new Date().toISOString(),
      };
      list.push(created);
      return created;
    }
    list[idx] = {
      ...list[idx],
      status,
      approvedBy: actor.id,
      approvedAt: new Date().toISOString(),
    };
    return list[idx];
  }
}
