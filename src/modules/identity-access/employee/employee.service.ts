import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { ListEmployeeDto, UpsertEmployeeDto, InsertBatchRoleDto } from './employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /adminapi/employee/info
   *
   * The MOST critical endpoint — called on EVERY page load by FE App.tsx.
   * Must return employee info + lstOrgApp (package/subscription) + permissions flat map.
   *
   * FE uses:
   *   - lstOrgApp[0].endDate → subscription expiry modal
   *   - lstOrgApp[0].period ≤ 36 → show renewal warning
   *   - defaultRedirect → post-login navigation target
   *   - isOwner === 1 → bypasses certain checks
   *   - permissions flat map → stored in localStorage["permissions"]
   */
  async getEmployeeInfo(currentUser: RequestUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: currentUser.id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true, code: true } },
        user: {
          include: {
            userRoles: {
              where: { deletedAt: null },
              include: {
                role: {
                  include: { permissions: true },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found for this user');
    }

    // Build flat permission map: { "customer.view": true, "customer.create": true, ... }
    const permissionsMap: Record<string, boolean> = {};
    const userRoles = employee.user?.userRoles ?? [];

    for (const ur of userRoles) {
      for (const p of ur.role.permissions) {
        // Format: "resourceCode.action" — matches FE localStorage["permissions"] structure
        const key = `${p.resourceCode}.${p.action}`;
        permissionsMap[key] = true;
      }
    }

    // Build role list for the "ChooseRole" modal (FE checks if user has multiple roles)
    const lstRole = userRoles.map((ur) => ({
      id: ur.roleId,
      code: ur.role.code,
      name: ur.role.name,
    }));

    // Find the active package/subscription from tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: { id: true, name: true, plan: true, createdAt: true },
    });

    // Build lstOrgApp array — FE checks endDate & period for renewal modal
    // In production, this would come from a Package/Subscription table
    // For now we synthesize from tenant.plan field and a config JSON stored in Artifact
    const packageConfig = await this.prisma.artifact.findFirst({
      where: {
        tenantId: currentUser.tenantId,
        code: 'package_config',
        isActive: true,
        deletedAt: null,
      },
    });

    const pkgValue = packageConfig?.value as
      | { endDate?: string; packageName?: string; period?: number }
      | undefined;

    const lstOrgApp = [
      {
        endDate: pkgValue?.endDate ?? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        packageName: pkgValue?.packageName ?? (tenant?.plan ?? 'Standard'),
        period: pkgValue?.period ?? 12,
      },
    ];

    return {
      // Core employee info
      id: employee.id,
      name: employee.name,
      code: employee.code,
      phone: employee.phone,
      email: employee.email,
      avatar: employee.avatar,
      position: employee.position,
      isActive: employee.isActive,

      // Department / branch context
      departmentId: employee.departmentId,
      department: employee.department,

      // FE-specific fields (from Section 13.3 of analysis report)
      branchId: employee.departmentId, // FE uses branchId — maps to departmentId
      branchName: employee.department?.name ?? null,
      isOwner: 0, // Would be 1 if tenant owner — derive from user.isSuperAdmin
      defaultRedirect: (employee as unknown as Record<string, unknown>)['defaultRedirect'] as string | null ?? '/customer',

      // Subscription info → drives renewal modal in FE Layout
      lstOrgApp,

      // RBAC
      lstRole,
      permissions: permissionsMap,

      // Tenant context
      tenantId: currentUser.tenantId,
      tenantName: tenant?.name,
    };
  }

  /**
   * GET /adminapi/employee/roles
   * Returns all roles assigned to this employee (for ChooseRole modal)
   */
  async getEmployeeRoles(currentUser: RequestUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: currentUser.id, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.userRole.findMany({
      where: { userId: currentUser.id, deletedAt: null },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });
  }

  /**
   * GET /adminapi/employee/list?page=&limit=&name=&branchId=
   */
  async list(dto: ListEmployeeDto, tenantId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (dto.name) where.name = { contains: dto.name, mode: 'insensitive' };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.isActive !== undefined) where.isActive = dto.isActive === 'true';

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          email: true,
          avatar: true,
          position: true,
          isActive: true,
          departmentId: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items,
      total,
      loadMoreAble: skip + items.length < total,
    };
  }

  /**
   * POST /adminapi/employee/update
   * Upsert pattern: no id → create, id present → update
   */
  async upsert(dto: UpsertEmployeeDto, actor: RequestUser) {
    if (dto.id) {
      // Update existing employee
      const existing = await this.prisma.employee.findFirst({
        where: { id: dto.id, tenantId: actor.tenantId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException(`Employee ${dto.id} not found`);

      return this.prisma.employee.update({
        where: { id: dto.id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          avatar: dto.avatar,
          position: dto.position,
          departmentId: dto.departmentId,
          code: dto.code,
          updatedBy: actor.id,
        },
      });
    }

    // Create new employee
    // Check for duplicate phone/email within tenant
    if (dto.phone) {
      const dup = await this.prisma.employee.findFirst({
        where: { tenantId: actor.tenantId, phone: dto.phone, deletedAt: null },
      });
      if (dup) throw new ConflictException(`Phone ${dto.phone} already registered to another employee`);
    }

    return this.prisma.employee.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        avatar: dto.avatar,
        position: dto.position,
        departmentId: dto.departmentId,
        code: dto.code,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  /**
   * GET /adminapi/employee/get?id=
   */
  async getById(employeeId: string, tenantId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      include: {
        department: true,
        user: {
          include: {
            userRoles: {
              where: { deletedAt: null },
              include: { role: { include: { permissions: true } } },
            },
          },
        },
      },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);
    return employee;
  }

  /**
   * DELETE /adminapi/employee/delete?id=
   * Soft delete only — employee data retained for audit trail
   */
  async softDelete(employeeId: string, actor: RequestUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: actor.tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { deletedAt: new Date(), deletedBy: actor.id, isActive: false },
    });
    return { message: 'Employee deactivated' };
  }

  /**
   * POST /adminapi/roleEmployee/insert-batch
   * Batch-assign roles to an employee (replaces existing assignments)
   */
  async insertBatchRoles(employeeId: string, dto: InsertBatchRoleDto, actor: RequestUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: actor.tenantId, deletedAt: null },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);
    if (!employee.user) throw new NotFoundException(`Employee ${employeeId} has no linked user account`);

    const userId = employee.user.id;

    // Replace all existing roles (soft delete then recreate)
    await this.prisma.userRole.updateMany({
      where: { userId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.userRole.createMany({
      data: dto.roleIds.map((roleId) => ({
        tenantId: actor.tenantId,
        userId,
        roleId,
        createdBy: actor.id,
      })),
      skipDuplicates: true,
    });

    return { message: `${dto.roleIds.length} role(s) assigned to employee` };
  }

  /**
   * GET /adminapi/roleEmployee/list?employeeId=
   */
  async listEmployeeRoles(employeeId: string, tenantId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      include: { user: true },
    });
    if (!employee?.user) return { items: [], total: 0, loadMoreAble: false };

    const roles = await this.prisma.userRole.findMany({
      where: { userId: employee.user.id, deletedAt: null },
      include: { role: true },
    });

    return {
      items: roles.map((r) => ({
        id: r.id,
        roleId: r.roleId,
        roleName: r.role.name,
        roleCode: r.role.code,
        createdAt: r.createdAt,
      })),
      total: roles.length,
      loadMoreAble: false,
    };
  }

  /**
   * DELETE /adminapi/roleEmployee/delete?id=
   * Remove a specific role assignment by UserRole ID
   */
  async removeEmployeeRole(userRoleId: string) {
    const ur = await this.prisma.userRole.findUnique({ where: { id: userRoleId } });
    if (!ur) throw new NotFoundException(`Role assignment ${userRoleId} not found`);
    await this.prisma.userRole.update({
      where: { id: userRoleId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Role removed from employee' };
  }

  /**
   * GET /adminapi/employee/select
   * Lightweight list for dropdown selects (no pagination)
   */
  async selectList(tenantId: string, name?: string, departmentId?: string) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      select: { id: true, name: true, phone: true, avatar: true, position: true, departmentId: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }
}
