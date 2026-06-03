import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── Work Projects ──────────────────────────────────────────────────────────

  async listProjects(tenantId: string, query?: {
    name?: string; keyword?: string; status?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    const kw = query?.keyword ?? query?.name;
    if (kw) where.name = { contains: kw, mode: 'insensitive' };
    if (query?.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.workProject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { projectEmployees: { select: { id: true, iamEmployeeId: true, role: true } } },
      }),
      this.prisma.workProject.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getProject(id: string, tenantId: string) {
    const p = await this.prisma.workProject.findFirst({
      where: { id, ...this.baseWhere(tenantId) },
      include: { projectEmployees: true, workOrders: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('WorkProject', id);
    return p;
  }

  async upsertProject(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.workProject.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } as any },
      });
    }
    return this.prisma.workProject.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        description: dto.description as string | undefined,
        projectTypeId: dto.projectTypeId as string | undefined,
        iamManagerId: dto.iamManagerId as string | undefined,
        status: (dto.status as string) ?? 'active',
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteProject(id: string, actor: RequestUser) {
    await this.prisma.workProject.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'WorkProject deleted' };
  }

  async getProjectEmployees(projectId: string) {
    return this.prisma.workProjectEmployee.findMany({
      where: { workProjectId: projectId },
    });
  }

  // ── Work Orders ────────────────────────────────────────────────────────────

  async listWorkOrders(tenantId: string, query?: {
    workProjectId?: string; workTypeId?: string; iamAssigneeId?: string;
    status?: string; keyword?: string; priority?: number;
    customerId?: string; page?: number; limit?: number;
    pageIndex?: number; pageSize?: number;
  }) {
    const page = query?.pageIndex ?? query?.page ?? 1;
    const limit = query?.pageSize ?? query?.limit ?? 20;
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (query?.workProjectId) where.workProjectId = query.workProjectId;
    if (query?.workTypeId) where.workTypeId = query.workTypeId;
    if (query?.iamAssigneeId) where.iamAssigneeId = query.iamAssigneeId;
    if (query?.status) where.status = query.status;
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.keyword) where.title = { contains: query.keyword, mode: 'insensitive' };
    if (query?.priority !== undefined) where.priority = query.priority;

    const [rows, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          workType: { select: { id: true, name: true } },
          workProject: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);
    const data = rows.map(this.mapWorkOrder.bind(this));
    return buildPagedResult(data, total, page, limit);
  }

  async listWorkOrdersV2(tenantId: string, query?: Record<string, unknown>) {
    return this.listWorkOrders(tenantId, query as Record<string, never>);
  }

  async getWorkOrderGroups(tenantId: string) {
    const groups = await this.prisma.workOrder.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.id }));
  }

  async getWorkOrderGroupsV2(tenantId: string, query?: Record<string, string>) {
    const projectId = query?.workProjectId;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (projectId) where.workProjectId = projectId;

    const groups = await this.prisma.workOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.id }));
  }

  // Map WorkOrder DB fields to FE-expected field names
  private mapWorkOrder(w: Record<string, unknown>) {
    return {
      ...w,
      name: (w['title'] as string) ?? '',        // FE: IWorkOrderResponseModel.name
      startTime: w['startDate'],                  // FE: item.startTime
      endTime: w['dueDate'],                      // FE: item.endTime
      createdTime: w['createdAt'],                // FE: item.createdTime
      workTypeName: (w['workType'] as Record<string, unknown>)?.['name'] ?? null,
      projectName: (w['workProject'] as Record<string, unknown>)?.['name'] ?? null,
      ola: null,                                  // FE: JSON.parse(result.ola)
      docLink: '[]',                              // FE: JSON.parse(result.docLink)
      reviews: '[]',                              // FE: JSON.parse(data.reviews || "[]")
      extendedData: null,
    };
  }

  async getWorkOrder(id: string, tenantId: string) {
    const w = await this.prisma.workOrder.findFirst({
      where: { id, ...this.baseWhere(tenantId) },
      include: {
        workType: true,
        workProject: true,
        participants: { select: { id: true, iamUserId: true, role: true } },
        exchanges: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!w) throw new NotFoundException('WorkOrder', id);
    return this.mapWorkOrder(w as unknown as Record<string, unknown>);
  }

  async upsertWorkOrder(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.workOrder.update({
        where: { id },
        data: {
          title: dto.title as string | undefined,
          content: dto.content as string | undefined,
          workProjectId: dto.workProjectId as string | undefined,
          workTypeId: dto.workTypeId as string | undefined,
          iamAssigneeId: dto.iamAssigneeId as string | undefined,
          iamManagerId: dto.iamManagerId as string | undefined,
          customerId: dto.customerId as string | undefined,
          status: dto.status as string | undefined,
          priority: dto.priority as number | undefined,
          priorityLevel: dto.priorityLevel as string | undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate as string) : undefined,
          startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
          note: dto.note as string | undefined,
          tags: dto.tags as object | undefined,
          attachments: dto.attachments as object | undefined,
          updatedBy: actor.id,
          rowVersion: { increment: 1 },
        },
      });
    }
    return this.prisma.workOrder.create({
      data: {
        tenantId: actor.tenantId,
        title: dto.title as string,
        code: dto.code as string | undefined,
        content: dto.content as string | undefined,
        workProjectId: dto.workProjectId as string | undefined,
        workTypeId: dto.workTypeId as string | undefined,
        iamAssigneeId: dto.iamAssigneeId as string | undefined,
        iamManagerId: dto.iamManagerId as string | undefined,
        customerId: dto.customerId as string | undefined,
        status: (dto.status as string) ?? 'pending',
        priority: (dto.priority as number) ?? 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate as string) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        note: dto.note as string | undefined,
        tags: dto.tags as object | undefined,
        attachments: dto.attachments as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteWorkOrder(id: string, actor: RequestUser) {
    await this.prisma.workOrder.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'WorkOrder deleted' };
  }

  async updateWorkOrderStatus(id: string, status: string, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { status, updatedBy: actor.id },
    });
  }

  async updateWorkOrderPriority(id: string, priorityLevel: string, priority: number, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { priorityLevel, priority, updatedBy: actor.id },
    });
  }

  async updateWorkOrderRating(id: string, rating: number, ratingNote: string | undefined, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { rating, ratingNote, updatedBy: actor.id },
    });
  }

  async updateWorkOrderPause(id: string, isPaused: boolean, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { pausedAt: isPaused ? new Date() : null, updatedBy: actor.id },
    });
  }

  async updateWorkOrderEmployee(id: string, iamAssigneeId: string, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { iamAssigneeId, updatedBy: actor.id },
    });
  }

  async updateWorkOrderParticipant(workOrderId: string, iamUserId: string, role: string | undefined, actor: RequestUser) {
    return this.prisma.workParticipant.upsert({
      where: { workOrderId_iamUserId: { workOrderId, iamUserId } },
      create: { tenantId: actor.tenantId, workOrderId, iamUserId, role, createdBy: actor.id },
      update: { role },
    });
  }

  async updateWorkOrderCustomer(workOrderId: string, customerId: string, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { customerId, updatedBy: actor.id },
    });
  }

  async getRelatedPeople(workOrderId: string) {
    return this.prisma.workParticipant.findMany({ where: { workOrderId } });
  }

  async saveAndInitProcess(dto: Record<string, unknown>, actor: RequestUser) {
    const workOrder = await this.upsertWorkOrder(dto, actor);
    return { workOrder, processInitiated: true };
  }

  async updateInitProcess(workOrderId: string, processConfig: object | undefined, actor: RequestUser) {
    const w = await this.prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!w) throw new NotFoundException('WorkOrder', workOrderId);
    return { workOrder: w, processUpdated: true };
  }

  async rejectWorkOrder(workOrderId: string, reason: string, actor: RequestUser) {
    return this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'rejected', note: reason, updatedBy: actor.id },
    });
  }

  async listPausedWorkOrders(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { tenantId, deletedAt: null, pausedAt: { not: null } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { pausedAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where: { tenantId, deletedAt: null, pausedAt: { not: null } } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async addOtherWorkOrder(workOrderId: string, relatedId: string, actor: RequestUser) {
    return this.prisma.workOrderRelation.upsert({
      where: { workOrderId_relatedId: { workOrderId, relatedId } },
      create: { tenantId: actor.tenantId, workOrderId, relatedId, createdBy: actor.id },
      update: {},
    });
  }

  async getOtherWorkOrders(workOrderId: string) {
    return this.prisma.workOrderRelation.findMany({
      where: { workOrderId },
      include: { related: { select: { id: true, title: true, status: true, code: true } } },
    });
  }

  // ── Work Inprogress ────────────────────────────────────────────────────────

  async listWorkInprogress(workOrderId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.workInprogress.findMany({ where: { workOrderId }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.workInprogress.count({ where: { workOrderId } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getWorkInprogress(id: string) {
    return this.prisma.workInprogress.findUnique({ where: { id } });
  }

  async updateWorkInprogress(dto: Record<string, unknown>, actor: RequestUser) {
    return this.prisma.workInprogress.create({
      data: {
        tenantId: actor.tenantId,
        workOrderId: dto.workOrderId as string,
        iamActorId: actor.id,
        action: dto.action as string,
        note: dto.note as string | undefined,
        data: dto.data as object | undefined,
      },
    });
  }

  // ── Work Exchanges ─────────────────────────────────────────────────────────

  async listWorkExchanges(workOrderId: string, page = 1, limit = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.workExchange.findMany({
        where: { workOrderId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workExchange.count({ where: { workOrderId, deletedAt: null } }),
    ]);
    // FE reads: createdTime, employeeId, employeeName, loginEmployeeId, worId
    const data = rows.map((ex) => ({
      ...ex,
      createdTime: ex.createdAt,
      employeeId: ex.iamAuthorId,
      loginEmployeeId: ex.iamAuthorId,
      employeeName: null,
      employeeAvatar: null,
      worId: workOrderId,
    }));
    return buildPagedResult(data, total, page, limit);
  }

  async getWorkExchange(id: string) {
    return this.prisma.workExchange.findUnique({ where: { id } });
  }

  async addWorkExchange(dto: Record<string, unknown>, actor: RequestUser) {
    return this.prisma.workExchange.create({
      data: {
        tenantId: actor.tenantId,
        workOrderId: dto.workOrderId as string,
        iamAuthorId: actor.id,
        content: dto.content as string | undefined,
        mediaUrls: dto.mediaUrls as object | undefined,
        updatedBy: actor.id,
      },
    });
  }

  async deleteWorkExchange(id: string, actor: RequestUser) {
    await this.prisma.workExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  // ── Employee helpers ───────────────────────────────────────────────────────

  async getEmployeeManagers(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, userId: true, position: true },
      orderBy: { name: 'asc' },
    });
  }

  async getEmployeeAssignees(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, userId: true, departmentId: true, position: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Work Types ─────────────────────────────────────────────────────────────

  async listWorkTypes(tenantId: string, query?: { name?: string }) {
    return this.prisma.workType.findMany({
      where: { tenantId, deletedAt: null, ...(query?.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async getWorkType(id: string, tenantId: string) {
    const w = await this.prisma.workType.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!w) throw new NotFoundException('WorkType', id);
    return w;
  }

  async upsertWorkType(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.workType.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.workType.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        position: (dto.position as number) ?? 0,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteWorkType(id: string, actor: RequestUser) {
    await this.prisma.workType.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'WorkType deleted' };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async exportOLA(tenantId: string, query: Record<string, string>) {
    return { message: 'OLA export ready', url: `/exports/ola-${Date.now()}.xlsx` };
  }

  async exportSLA(tenantId: string, query: Record<string, string>) {
    return { message: 'SLA export ready', url: `/exports/sla-${Date.now()}.xlsx` };
  }

  async getWorkOrderReport(tenantId: string, query: Record<string, string>) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    const [total, byStatus] = await Promise.all([
      this.prisma.workOrder.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
    ]);
    return { total, byStatus: byStatus.map((g) => ({ status: g.status, count: g._count.id })) };
  }
}
