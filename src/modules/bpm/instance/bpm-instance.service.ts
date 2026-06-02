import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { BpmEngineService } from './bpm-engine.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmInstanceService {
  constructor(
    private prisma: PrismaService,
    private engine: BpmEngineService,
  ) {}

  async list(tenantId: string, query?: { templateId?: string; status?: string; refType?: string; refId?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.templateId) where.templateId = query.templateId;
    if (query?.status) where.status = query.status;
    if (query?.refType) where.refType = query.refType;
    if (query?.refId) where.refId = query.refId;

    const [data, total] = await Promise.all([
      this.prisma.bpmProcessInstance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
          tokens: { where: { status: 'active' }, include: { node: true } },
        },
      }),
      this.prisma.bpmProcessInstance.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const instance = await this.prisma.bpmProcessInstance.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        template: { include: { nodes: { where: { deletedAt: null } }, edges: true } },
        tokens: { include: { node: true } },
        workOrders: { where: { deletedAt: null } },
        history: { orderBy: { occurredAt: 'asc' } },
      },
    });
    if (!instance) throw new NotFoundException('BpmProcessInstance', id);
    return instance;
  }

  async start(templateId: string, dto: { refType?: string; refId?: string; variables?: object }, actor: RequestUser) {
    return this.engine.startProcess(templateId, dto, actor);
  }

  async claimTask(tokenId: string, actor: RequestUser) {
    return this.engine.claimTask(tokenId, actor);
  }

  async completeTask(tokenId: string, variables?: object, actor?: RequestUser) {
    return this.engine.completeTask(tokenId, variables, actor);
  }

  async delegateTask(tokenId: string, targetUserId: string, reason: string, actor: RequestUser) {
    return this.engine.delegateTask(tokenId, targetUserId, reason, actor);
  }

  async getHistory(instanceId: string, tenantId: string) {
    return this.engine.getInstanceHistory(instanceId, tenantId);
  }

  async getKanbanView(tenantId: string, templateId: string) {
    return this.engine.getKanbanView(tenantId, templateId);
  }

  async listMyTasks(actor: RequestUser, query?: { page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    return this.prisma.bpmTaskToken.findMany({
      where: {
        tenantId: actor.tenantId,
        status: 'active',
        OR: [{ iamAssigneeId: actor.id }, { iamAssigneeId: null }],
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        node: true,
        instance: {
          include: { template: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async activateProcess(dto: Record<string, unknown>, actor: RequestUser) {
    // Legacy API compatibility (Kafka activation from frontend)
    const templateId = dto.templateId as string;
    const refType = dto.refType as string | undefined;
    const refId = dto.refId as string | undefined;
    return this.engine.startProcess(templateId, { refType, refId, variables: dto.variables as object }, actor);
  }
}
