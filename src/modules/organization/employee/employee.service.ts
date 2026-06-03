import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; departmentId?: string; page?: number | string; limit?: number | string }) {
    const page = parsePage(query?.page);
    const limit = parseLimit(query?.limit);

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.departmentId) where.departmentId = query.departmentId;

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { department: { select: { id: true, name: true } } },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return buildPagedResult(items, total, page, limit);
  }

  async getById(id: string, tenantId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true, isActive: true } },
      },
    });
    if (!emp) throw new NotFoundException('Employee', id);
    return {
      ...emp,
      departmentName: emp.department?.name ?? null,
      branchId: emp.departmentId ?? null,
      branchName: emp.department?.name ?? null,
      lstOrgApp: [{ endDate: '2099-12-31T23:59:59Z', packageName: 'Gói Vĩnh Viễn' }],
    };
  }

  async getInfo(tenantId: string, userId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { userId, tenantId, deletedAt: null },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!emp) return null;
    return {
      ...emp,
      branchId: emp.departmentId ?? null,
      branchName: emp.department?.name ?? null,
      defaultRedirect: '/customer',
      lstOrgApp: [{ endDate: '2099-12-31T23:59:59Z', packageName: 'Gói Vĩnh Viễn' }],
    };
  }

  async upsert(
    dto: {
      id?: string;
      name: string;
      code?: string;
      phone?: string;
      email?: string;
      avatar?: string;
      position?: string;
      departmentId?: string;
      isActive?: boolean;
    },
    actor: RequestUser,
  ) {
    if (dto.id) {
      return this.prisma.employee.update({
        where: { id: dto.id },
        data: { ...dto, id: undefined, updatedBy: actor.id },
      });
    }
    return this.prisma.employee.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        code: dto.code,
        phone: dto.phone,
        email: dto.email,
        avatar: dto.avatar,
        position: dto.position,
        departmentId: dto.departmentId,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Employee deleted' };
  }

  async linkUser(employeeId: string, userId: string, actor: RequestUser) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { userId, updatedBy: actor.id },
    });
  }

  async listByDepartment(departmentId: string, tenantId: string) {
    return this.prisma.employee.findMany({
      where: { departmentId, tenantId, deletedAt: null },
      select: { id: true, name: true, avatar: true, phone: true, position: true },
    });
  }

  async getRoles(employeeId: string, tenantId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: { select: { id: true, name: true } },
        user: {
          include: {
            userRoles: {
              where: { deletedAt: null },
              include: { role: true },
            },
          },
        },
      },
    });
    if (!emp?.user) return [];
    type RoleWithMeta = { id: string; name: string; code: string };
    const userRoles = emp.user.userRoles as Array<{ role: RoleWithMeta }>;
    return userRoles.map((ur) => ({
      ...ur.role,
      // FE reads: item.title, item.departmentId, item.departmentName
      title: ur.role.name,
      departmentId: emp.departmentId ?? null,
      departmentName: emp.department?.name ?? null,
    }));
  }

  async init(tenantId: string, actor: RequestUser) {
    const [departments, roles] = await Promise.all([
      this.prisma.department.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.role.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true, code: true } }),
    ]);
    return { departments, roles };
  }

  async listExTip(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, avatar: true, phone: true, position: true, departmentId: true },
      orderBy: { name: 'asc' },
    });
  }

  async generateRandomPass() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return { password: pass };
  }

  async updateToken(employeeId: string, token: string, actor: RequestUser) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { updatedBy: actor.id },
    });
  }

  async checkEmailConnection(employeeId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, email: true },
    });
    return { connected: !!(emp?.email), email: emp?.email };
  }

  async disconnectEmail(employeeId: string, actor: RequestUser) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { email: null, updatedBy: actor.id },
    });
  }

  async listByFullName(tenantId: string, query?: { name?: string; departmentId?: string; page?: number; limit?: number }) {
    return this.list(tenantId, query);
  }
}
