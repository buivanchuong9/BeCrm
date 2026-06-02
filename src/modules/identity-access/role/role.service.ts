import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.role.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role', id);
    return role;
  }

  async upsert(dto: { id?: string; name: string; code: string; description?: string }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.role.update({
        where: { id: dto.id },
        data: { name: dto.name, code: dto.code, description: dto.description, updatedBy: actor.id },
      });
    }
    return this.prisma.role.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Role deleted' };
  }

  async getEmployeeRoles(employeeId: string, tenantId: string) {
    return this.prisma.userRole.findMany({
      where: { user: { employee: { id: employeeId } }, deletedAt: null },
      include: { role: true },
    });
  }

  async deleteUserRole(id: string) {
    return this.prisma.userRole.delete({ where: { id } });
  }

  async insertBatchEmployeeRoles(
    employeeId: string,
    roleIds: string[],
    actor: RequestUser,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { employee: { id: employeeId }, tenantId: actor.tenantId },
    });
    if (!user) throw new NotFoundException('Employee user', employeeId);

    await this.prisma.userRole.deleteMany({ where: { userId: user.id } });
    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        tenantId: actor.tenantId,
        userId: user.id,
        roleId,
        createdBy: actor.id,
      })),
      skipDuplicates: true,
    });
    return { message: 'Roles assigned' };
  }
}
