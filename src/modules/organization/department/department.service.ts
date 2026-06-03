import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { position: 'asc' },
        include: { children: { where: { deletedAt: null }, select: { id: true, name: true } } },
      }),
      this.prisma.department.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getById(id: string, tenantId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { children: { where: { deletedAt: null } }, employees: { where: { deletedAt: null }, select: { id: true, name: true } } },
    });
    if (!dept) throw new NotFoundException('Department', id);
    return dept;
  }

  async upsert(
    dto: { id?: string; name: string; code?: string; parentId?: string; position?: number },
    actor: RequestUser,
  ) {
    if (dto.id) {
      return this.prisma.department.update({
        where: { id: dto.id },
        data: { name: dto.name, code: dto.code, parentId: dto.parentId, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.department.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId,
        position: dto.position ?? 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Department deleted' };
  }

  async updateParent(id: string, parentId: string | null, actor: RequestUser) {
    return this.prisma.department.update({
      where: { id },
      data: { parentId, updatedBy: actor.id },
    });
  }

  async listByBranch(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, deletedAt: null, parentId: null },
      include: { children: { where: { deletedAt: null } } },
      orderBy: { position: 'asc' },
    });
  }
}
