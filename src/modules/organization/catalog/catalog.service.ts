import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // ── Area ───────────────────────────────────────────────────────────────────

  async listAreaChildren(parentId?: string, areaType?: string) {
    return this.prisma.area.findMany({
      where: {
        parentId: parentId ?? null,
        isActive: true,
        ...(areaType ? { areaType } : {}),
      },
      orderBy: { position: 'asc' },
    });
  }

  // ── BeautyBranch ───────────────────────────────────────────────────────────

  async listBranches(tenantId: string, query?: {
    parentId?: string; keyword?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.parentId !== undefined) where.parentId = query.parentId || null;
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.beautyBranch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { children: { where: { deletedAt: null, tenantId } } },
      }),
      this.prisma.beautyBranch.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async listBranchChildren(tenantId: string, parentId: string) {
    return this.prisma.beautyBranch.findMany({
      where: { tenantId, parentId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async getBranch(id: string, tenantId: string) {
    const b = await this.prisma.beautyBranch.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
    });
    if (!b) throw new NotFoundException('BeautyBranch', id);
    return b;
  }

  async getBranchByCode(code: string, tenantId: string) {
    const b = await this.prisma.beautyBranch.findFirst({ where: { code, tenantId, deletedAt: null } });
    if (!b) throw new NotFoundException('BeautyBranch', code);
    return b;
  }

  async upsertBranch(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.beautyBranch.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } as any },
      });
    }
    return this.prisma.beautyBranch.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        parentId: dto.parentId as string | undefined,
        address: dto.address as string | undefined,
        phone: dto.phone as string | undefined,
        managerId: dto.managerId as string | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteBranch(id: string, actor: RequestUser) {
    await this.prisma.beautyBranch.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BeautyBranch deleted' };
  }

  async activateBranch(id: string, actor: RequestUser) {
    return this.prisma.beautyBranch.update({ where: { id }, data: { isActive: true, updatedBy: actor.id } });
  }

  async deactivateBranch(id: string, actor: RequestUser) {
    return this.prisma.beautyBranch.update({ where: { id }, data: { isActive: false, updatedBy: actor.id } });
  }

  // ── BeautySalon ────────────────────────────────────────────────────────────

  async listSalons(tenantId: string, query?: { keyword?: string; status?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };
    if (query?.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.beautySalon.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.beautySalon.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async approveSalon(id: string, actor: RequestUser) {
    return this.prisma.beautySalon.update({
      where: { id },
      data: { status: 'approved', approvedAt: new Date(), approvedBy: actor.id, updatedBy: actor.id },
    });
  }

  async deleteSalon(id: string, actor: RequestUser) {
    await this.prisma.beautySalon.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BeautySalon deleted' };
  }

  // ── Artifact / Common ──────────────────────────────────────────────────────

  async listArtifacts(tenantId: string, query?: { keyword?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.artifact.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.artifact.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getArtifact(id: string) {
    const a = await this.prisma.artifact.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Artifact', id);
    return a;
  }

  async upsertArtifact(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.artifact.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.artifact.create({
      data: {
        tenantId: actor.tenantId,
        code: dto.code as string,
        name: dto.name as string,
        description: dto.description as string | undefined,
        value: dto.value as object | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteArtifact(id: string, actor: RequestUser) {
    await this.prisma.artifact.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Artifact deleted' };
  }

  // ── BrandName ──────────────────────────────────────────────────────────────

  async listBrandNames(tenantId: string, query?: { keyword?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.brandName.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.brandName.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertBrandName(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.brandName.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.brandName.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        provider: dto.provider as string | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteBrandName(id: string, actor: RequestUser) {
    await this.prisma.brandName.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BrandName deleted' };
  }

  async listWhitelists(tenantId: string, brandNameId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.brandNameWhitelist.findMany({
        where: { tenantId, brandNameId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.brandNameWhitelist.count({ where: { tenantId, brandNameId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async upsertWhitelist(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.brandNameWhitelist.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.brandNameWhitelist.create({
      data: {
        tenantId: actor.tenantId,
        brandNameId: dto.brandNameId as string,
        contactPhone: dto.contactPhone as string,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteWhitelist(id: string, actor: RequestUser) {
    await this.prisma.brandNameWhitelist.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Whitelist entry deleted' };
  }

  async updateWhitelistStatus(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.brandNameWhitelist.update({
      where: { id },
      data: { isActive, updatedBy: actor.id },
    });
  }

  // ── ProjectType ────────────────────────────────────────────────────────────

  async listProjectTypes(tenantId: string, query?: { keyword?: string }) {
    return this.prisma.projectType.findMany({
      where: { tenantId, deletedAt: null, ...(query?.keyword ? { name: { contains: query.keyword, mode: 'insensitive' } } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertProjectType(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.projectType.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.projectType.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        position: (dto.position as number) ?? 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteProjectType(id: string, actor: RequestUser) {
    await this.prisma.projectType.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'ProjectType deleted' };
  }
}
