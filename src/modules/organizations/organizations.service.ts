import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { toOffsetPage } from '../../common/pagination/pagination.util';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    principal: AuthenticatedPrincipal,
    params: { page: number; limit: number; search?: string },
  ) {
    const isSuperAdmin = principal.memberships.some((m) => m.role === 'super_administrator');
    const organizationIds = [...new Set(principal.memberships.map((m) => m.organizationId))];
    const where = {
      ...(isSuperAdmin ? {} : { id: { in: organizationIds } }),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return toOffsetPage(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        status: r.status,
        version: r.version,
      })),
      total,
      params.page,
      params.limit,
    );
  }

  /** Reference data: authenticated (not org-scope-restricted) per docs/api.md
   * section 25 — clinic locations/departments are not PHI. */
  async listClinicLocations(params: { organizationId?: string; search?: string; status?: string }) {
    const rows = await this.prisma.clinicLocation.findMany({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.status ? { status: params.status as 'active' | 'inactive' } : {}),
        ...(params.search
          ? { name: { contains: params.search, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      code: r.code,
      name: r.name,
      timezone: r.timezone,
      address: null,
      status: r.status,
    }));
  }

  async listDepartments(params: { clinicLocationId?: string; search?: string; status?: string }) {
    const rows = await this.prisma.department.findMany({
      where: {
        ...(params.clinicLocationId ? { clinicLocationId: params.clinicLocationId } : {}),
        ...(params.search
          ? { name: { contains: params.search, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      clinicLocationId: r.clinicLocationId,
      code: r.code,
      name: r.name,
      status: r.status,
    }));
  }
}
