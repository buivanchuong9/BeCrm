import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  async listGroups(tenantId: string, query?: { name?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { employees: { where: { deletedAt: null } } },
      }),
      this.prisma.group.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getGroup(id: string, tenantId: string) {
    const g = await this.prisma.group.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { employees: { where: { deletedAt: null } } },
    });
    if (!g) throw new NotFoundException('Group', id);
    return g;
  }

  async upsertGroup(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.group.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } as any },
      });
    }
    return this.prisma.group.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        description: dto.description as string | undefined,
        iamLeaderId: dto.iamLeaderId as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteGroup(id: string, actor: RequestUser) {
    await this.prisma.group.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Group deleted' };
  }

  async listGroupEmployees(groupId: string, page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.groupEmployee.findMany({
        where: { groupId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.groupEmployee.count({ where: { groupId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async addGroupEmployee(dto: { groupId: string; iamEmployeeId: string; role?: string }, actor: RequestUser) {
    return this.prisma.groupEmployee.upsert({
      where: { groupId_iamEmployeeId: { groupId: dto.groupId, iamEmployeeId: dto.iamEmployeeId } },
      create: {
        tenantId: actor.tenantId,
        groupId: dto.groupId,
        iamEmployeeId: dto.iamEmployeeId,
        role: dto.role,
        createdBy: actor.id,
      },
      update: { role: dto.role, deletedAt: null },
    });
  }

  async deleteGroupEmployee(id: string, actor: RequestUser) {
    await this.prisma.groupEmployee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Group employee removed' };
  }
}
