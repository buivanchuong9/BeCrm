import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

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
}
