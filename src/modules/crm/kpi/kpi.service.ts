import { Injectable } from '@nestjs/common';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type Dto = Record<string, unknown>;

@Injectable()
export class KpiService {
  constructor(private prisma: PrismaService) {}

  async listTemplates(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.kpiTemplate.findMany({ where: { tenantId, deletedAt: null }, skip: (page - 1) * limit, take: limit, include: { goals: { where: { deletedAt: null } } } }),
      this.prisma.kpiTemplate.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertTemplate(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.kpiTemplate.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.kpiTemplate.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTemplate(id: string, actor: RequestUser) {
    await this.prisma.kpiTemplate.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async upsertTemplateGoal(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.kpiTemplateGoal.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.kpiTemplateGoal.create({ data: { tenantId: actor.tenantId, templateId: dto.templateId as string, name: dto.name as string, metricKey: dto.metricKey as string, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTemplateGoal(id: string, actor: RequestUser) {
    await this.prisma.kpiTemplateGoal.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listSetups(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.iamEmployeeId) where.iamEmployeeId = q.iamEmployeeId;
    if (q.period) where.period = q.period;
    const [data, total] = await Promise.all([
      this.prisma.kpiSetup.findMany({ where, skip: (page - 1) * limit, take: limit, include: { goals: { where: { deletedAt: null } } } }),
      this.prisma.kpiSetup.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertSetup(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.kpiSetup.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.kpiSetup.create({ data: { tenantId: actor.tenantId, templateId: dto.templateId as string | undefined, iamEmployeeId: dto.iamEmployeeId as string | undefined, period: dto.period as string, periodStart: new Date(dto.periodStart as string), periodEnd: new Date(dto.periodEnd as string), status: 'draft', createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteSetup(id: string, actor: RequestUser) {
    await this.prisma.kpiSetup.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async upsertGoal(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.kpiGoal.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.kpiGoal.create({ data: { tenantId: actor.tenantId, kpiSetupId: dto.kpiSetupId as string, name: dto.name as string, metricKey: dto.metricKey as string, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteGoal(id: string, actor: RequestUser) {
    await this.prisma.kpiGoal.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async getDatasource(tenantId: string) { return { datasources: ['contract.totalValue', 'opportunity.count', 'customer.count', 'ticket.count'] }; }

  async listObjects(tenantId: string) { return this.listSetups(tenantId, {}, 1, 100); }
  async getObject(id: string) { return this.prisma.kpiSetup.findUnique({ where: { id } }); }
  async getObjectByRef(tenantId: string, objectType: string, objectId: string) {
    return this.prisma.kpiSetup.findFirst({ where: { tenantId, deletedAt: null } });
  }
  async getEmployeeResult(tenantId: string, q: Dto) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.iamEmployeeId) where.iamEmployeeId = q.iamEmployeeId;
    return this.prisma.kpiSetup.findMany({ where, take: 20 });
  }
  async upsertObject(dto: Dto, actor: RequestUser) { return this.upsertSetup(dto, actor); }
  async deleteObject(id: string, actor: RequestUser) { return this.deleteSetup(id, actor); }

  async listSetupObjects(tenantId: string, kotId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (kotId) where.templateId = kotId;
    return this.prisma.kpiSetup.findMany({ where, take: 50 });
  }

  async listGoals(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.kpiSetupId) where.kpiSetupId = q.kpiSetupId;
    return this.prisma.kpiGoal.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  async getGoal(id: string) {
    return this.prisma.kpiGoal.findUnique({ where: { id } });
  }

  async listTemplateGoals(tenantId: string, templateId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (templateId) where.templateId = templateId;
    return this.prisma.kpiTemplateGoal.findMany({ where });
  }

  // KpiExchange not in schema — stubs
  async listExchanges(kpiSetupId: string) { return []; }
  async getExchange(id: string) { return { id }; }
  async upsertExchange(dto: Dto, actor: RequestUser) { return { ...dto, id: (dto.id as string) ?? `kex-${Date.now()}` }; }
  async deleteExchange(id: string, actor: RequestUser) { return { message: 'Deleted' }; }

  // KpiApply not in schema — stubs
  async listApply(tenantId: string, q: Dto = {}) { return buildPagedResult([], 0, 1, 20); }
  async getApplyByCampaign(tenantId: string, campaignId: string) { return null; }
  async upsertApply(dto: Dto, actor: RequestUser) { return { ...dto, id: (dto.id as string) ?? `ka-${Date.now()}` }; }
  async deleteApply(id: string, actor: RequestUser) { return { message: 'Deleted' }; }

  async addExchange(dto: Dto, actor: RequestUser) { return this.upsertExchange(dto, actor); }
  async applyKpi(dto: Dto, actor: RequestUser) { return this.upsertApply(dto, actor); }
}
