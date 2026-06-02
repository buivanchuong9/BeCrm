import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class ApprovalAdminService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── Approval ────────────────────────────────────────────────────────────────

  async list(tenantId: string, query?: {
    keyword?: string; status?: number; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };
    if (query?.status !== undefined) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { configs: { where: { deletedAt: null } } },
      }),
      this.prisma.approval.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.approval.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          code: dto.code as string | undefined,
          objectType: dto.objectType as string | undefined,
          status: dto.status as number | undefined,
          config: dto.config as object | undefined,
          updatedBy: actor.id,
          rowVersion: { increment: 1 },
        },
      });
    }
    return this.prisma.approval.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        objectType: dto.objectType as string | undefined,
        status: (dto.status as number) ?? 1,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.approval.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Approval deleted' };
  }

  async updateStatus(id: string, status: number, actor: RequestUser) {
    return this.prisma.approval.update({
      where: { id },
      data: { status, updatedBy: actor.id },
    });
  }

  async updateAlertConfig(id: string, alertConfig: object, actor: RequestUser) {
    return this.prisma.approval.update({
      where: { id },
      data: { alertConfig, updatedBy: actor.id },
    });
  }

  // ── ApprovalConfig ──────────────────────────────────────────────────────────

  async listConfigs(tenantId: string, approvalId?: string, query?: { page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (approvalId) where.approvalId = approvalId;

    const [data, total] = await Promise.all([
      this.prisma.approvalConfig.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { stepNo: 'asc' } }),
      this.prisma.approvalConfig.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertConfig(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.approvalConfig.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.approvalConfig.create({
      data: {
        tenantId: actor.tenantId,
        approvalId: dto.approvalId as string,
        stepNo: (dto.stepNo as number) ?? 1,
        name: dto.name as string,
        approverType: (dto.approverType as string) ?? 'user',
        approverId: dto.approverId as string | undefined,
        isParallel: (dto.isParallel as boolean) ?? false,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteConfig(id: string, actor: RequestUser) {
    await this.prisma.approvalConfig.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'ApprovalConfig deleted' };
  }

  // ── ApprovalLink ────────────────────────────────────────────────────────────

  async listLinks(tenantId: string, approvalId?: string, query?: { page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (approvalId) where.approvalId = approvalId;

    const [data, total] = await Promise.all([
      this.prisma.approvalLink.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.approvalLink.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertLink(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.approvalLink.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.approvalLink.create({
      data: {
        tenantId: actor.tenantId,
        approvalId: dto.approvalId as string,
        objectType: dto.objectType as string,
        condition: dto.condition as object | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteLink(id: string, actor: RequestUser) {
    await this.prisma.approvalLink.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'ApprovalLink deleted' };
  }

  // ── ApprovalObject ──────────────────────────────────────────────────────────

  async listObjects(tenantId: string, query?: {
    approvalId?: string; objectType?: string; status?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.approvalId) where.approvalId = query.approvalId;
    if (query?.objectType) where.objectType = query.objectType;
    if (query?.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.approvalObject.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.approvalObject.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getObject(id: string) {
    const o = await this.prisma.approvalObject.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('ApprovalObject', id);
    return o;
  }

  async getObjectByRef(objectType: string, objectId: string, tenantId: string) {
    return this.prisma.approvalObject.findFirst({
      where: { objectType, objectId, tenantId, deletedAt: null },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async checkApproved(objectType: string, objectId: string, tenantId: string) {
    const obj = await this.prisma.approvalObject.findFirst({
      where: { objectType, objectId, tenantId, deletedAt: null },
    });
    return { isApproved: obj?.isApproved ?? false, status: obj?.status ?? 'not_found', objectId };
  }

  async upsertObject(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.approvalObject.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.approvalObject.create({
      data: {
        tenantId: actor.tenantId,
        approvalId: dto.approvalId as string,
        objectType: dto.objectType as string,
        objectId: dto.objectId as string,
        currentStep: (dto.currentStep as number) ?? 1,
        status: 'pending',
        isApproved: false,
        data: dto.data as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteObject(id: string, actor: RequestUser) {
    await this.prisma.approvalObject.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'ApprovalObject deleted' };
  }

  // ── ApprovalLog ─────────────────────────────────────────────────────────────

  async listLogs(tenantId: string, query?: {
    approvalId?: string; approvalObjectId?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.approvalId) where.approvalId = query.approvalId;
    if (query?.approvalObjectId) where.approvalObjectId = query.approvalObjectId;

    const [data, total] = await Promise.all([
      this.prisma.approvalLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.approvalLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertLog(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.approvalLog.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.approvalLog.create({
      data: {
        tenantId: actor.tenantId,
        approvalId: dto.approvalId as string,
        approvalObjectId: dto.approvalObjectId as string | undefined,
        stepNo: (dto.stepNo as number) ?? 1,
        iamActorId: actor.id,
        action: dto.action as string,
        comment: dto.comment as string | undefined,
        data: dto.data as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteLog(id: string, actor: RequestUser) {
    await this.prisma.approvalLog.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'ApprovalLog deleted' };
  }
}
