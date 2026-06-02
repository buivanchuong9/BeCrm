import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmWorkOrderService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    instanceId?: string; status?: string; iamAssigneeId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.instanceId) where.instanceId = query.instanceId;
    if (query?.status) where.status = query.status;
    if (query?.iamAssigneeId) where.iamAssigneeId = query.iamAssigneeId;

    const [data, total] = await Promise.all([
      this.prisma.bpmWorkOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instance: { include: { template: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.bpmWorkOrder.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const wo = await this.prisma.bpmWorkOrder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        instance: { include: { template: true } },
        exchanges: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        approvals: true,
      },
    });
    if (!wo) throw new NotFoundException('BpmWorkOrder', id);
    return wo;
  }

  async create(
    dto: {
      instanceId: string;
      title: string;
      content?: string;
      iamAssigneeId?: string;
      priority?: number;
      dueDate?: Date;
      note?: string;
    },
    actor: RequestUser,
  ) {
    return this.prisma.bpmWorkOrder.create({
      data: {
        tenantId: actor.tenantId,
        instanceId: dto.instanceId,
        code: `WO-${Date.now()}`,
        title: dto.title,
        content: dto.content,
        iamAssigneeId: dto.iamAssigneeId,
        status: 'pending',
        priority: dto.priority ?? 0,
        dueDate: dto.dueDate,
        note: dto.note,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async update(id: string, dto: Record<string, unknown>, actor: RequestUser) {
    const wo = await this.prisma.bpmWorkOrder.findUnique({ where: { id } });
    if (!wo || wo.tenantId !== actor.tenantId) throw new NotFoundException('BpmWorkOrder', id);
    if (dto.rowVersion && wo.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

    return this.prisma.bpmWorkOrder.update({
      where: { id },
      data: {
        title: dto.title as string | undefined,
        content: dto.content as string | undefined,
        iamAssigneeId: dto.iamAssigneeId as string | undefined,
        status: dto.status as string | undefined,
        priority: dto.priority as number | undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate as string) : undefined,
        note: dto.note as string | undefined,
        completedAt: (dto.status === 'completed') ? new Date() : undefined,
        rowVersion: { increment: 1 },
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.bpmWorkOrder.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Work order deleted' };
  }

  async addExchange(dto: { workOrderId: string; content?: string; mediaUrls?: object }, actor: RequestUser) {
    return this.prisma.bpmWorkOrderExchange.create({
      data: {
        tenantId: actor.tenantId,
        workOrderId: dto.workOrderId,
        iamAuthorId: actor.id,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.bpmWorkOrderExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }
}
