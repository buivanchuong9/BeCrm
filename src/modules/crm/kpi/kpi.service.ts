import { Injectable } from '@nestjs/common';
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
    return { data, total, page, limit };
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
    return { data, total, page, limit };
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
  async listObjects(tenantId: string) { return this.listSetups(tenantId); }
  async upsertObject(dto: Dto, actor: RequestUser) { return this.upsertSetup(dto, actor); }
  async deleteObject(id: string, actor: RequestUser) { return this.deleteSetup(id, actor); }
  async listExchanges(kpiSetupId: string) { return []; }
  async addExchange(dto: Dto, actor: RequestUser) { return { message: 'Exchange added' }; }
  async applyKpi(dto: Dto, actor: RequestUser) { return { applied: true }; }
}
