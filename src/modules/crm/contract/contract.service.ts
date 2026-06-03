import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

type Dto = Record<string, unknown>;

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  private bw(tenantId: string) { return { tenantId, deletedAt: null }; }

  // ── Contract ───────────────────────────────────────────────────────────────

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.bw(tenantId);
    if (q.keyword) where.title = { contains: q.keyword as string, mode: 'insensitive' };
    if (q.customerId) where.customerId = q.customerId;
    if (q.status) where.status = q.status;
    if (q.pipelineId) where.pipelineId = q.pipelineId;
    if (q.stageId) where.stageId = q.stageId;
    if (q.iamOwnerId) where.iamOwnerId = q.iamOwnerId;
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { pipeline: { select: { id: true, name: true } }, stage: { select: { id: true, name: true, colorHex: true } } } }),
      this.prisma.contract.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getById(id: string, tenantId: string) {
    const c = await this.prisma.contract.findFirst({ where: { id, ...this.bw(tenantId) }, include: { pipeline: true, stage: true, activities: { orderBy: { createdAt: 'desc' }, take: 10 }, payments: { where: { deletedAt: null } } } });
    if (!c) throw new NotFoundException('Contract', id);
    return c;
  }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.contract.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    }
    return this.prisma.contract.create({ data: { tenantId: actor.tenantId, title: dto.title as string, code: dto.code as string | undefined, customerId: dto.customerId as string | undefined, contactId: dto.contactId as string | undefined, pipelineId: dto.pipelineId as string | undefined, stageId: dto.stageId as string | undefined, iamOwnerId: dto.iamOwnerId as string | undefined, status: (dto.status as string) ?? 'draft', contractDate: dto.contractDate ? new Date(dto.contractDate as string) : undefined, expiryDate: dto.expiryDate ? new Date(dto.expiryDate as string) : undefined, description: dto.description as string | undefined, note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Contract deleted' };
  }

  async updateStatus(id: string, status: string, actor: RequestUser) {
    return this.prisma.contract.update({ where: { id }, data: { status, updatedBy: actor.id } });
  }

  async upsertAndInit(dto: Dto, actor: RequestUser) {
    const contract = await this.upsert(dto, actor);
    return { contract, processInitiated: true };
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async dashboardByStatus(tenantId: string) {
    const groups = await this.prisma.contract.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: { id: true } });
    return groups.map((g) => ({ status: g.status, count: g._count.id }));
  }

  async dashboardPipeline(tenantId: string, pipelineId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (pipelineId) where.pipelineId = pipelineId;
    return this.prisma.contract.groupBy({ by: ['stageId'], where, _count: { id: true }, _sum: { totalValue: true } });
  }

  async dashboardNewByTime(tenantId: string, q: Dto) {
    const [total, thisMonth] = await Promise.all([
      this.prisma.contract.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.contract.count({ where: { tenantId, deletedAt: null, createdAt: { gte: new Date(new Date().setDate(1)) } } }),
    ]);
    return { total, thisMonth };
  }

  async dashboardDealValue(tenantId: string) {
    return this.prisma.contract.aggregate({ where: { tenantId, deletedAt: null }, _sum: { totalValue: true } });
  }

  async getAlertConfig(id: string) {
    const c = await this.prisma.contract.findUnique({ where: { id }, select: { id: true, title: true, expiryDate: true } });
    return c;
  }

  async updateAlertConfig(id: string, config: object, actor: RequestUser) {
    return this.prisma.contract.update({ where: { id }, data: { updatedBy: actor.id } as any });
  }

  // ── ContractPipeline ───────────────────────────────────────────────────────

  async listPipelines(tenantId: string) {
    return this.prisma.contractPipeline.findMany({ where: { tenantId, deletedAt: null }, include: { stages: { where: { deletedAt: null }, orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' } });
  }

  async upsertPipeline(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.contractPipeline.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.contractPipeline.create({ data: { tenantId: actor.tenantId, name: dto.name as string, position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deletePipeline(id: string, actor: RequestUser) {
    await this.prisma.contractPipeline.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Pipeline deleted' };
  }

  // ── ContractStage ──────────────────────────────────────────────────────────

  async listStages(tenantId: string, pipelineId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (pipelineId) where.pipelineId = pipelineId;
    return this.prisma.contractStage.findMany({ where, orderBy: { position: 'asc' } });
  }

  async upsertStage(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.contractStage.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.contractStage.create({ data: { tenantId: actor.tenantId, pipelineId: dto.pipelineId as string, name: dto.name as string, position: (dto.position as number) ?? 0, colorHex: dto.colorHex as string | undefined, isWon: (dto.isWon as boolean) ?? false, isLost: (dto.isLost as boolean) ?? false, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteStage(id: string, actor: RequestUser) {
    await this.prisma.contractStage.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Stage deleted' };
  }

  // ── ContractActivity ───────────────────────────────────────────────────────

  async listActivities(contractId: string, tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.contractActivity.findMany({ where: { contractId, tenantId, deletedAt: null }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.contractActivity.count({ where: { contractId, tenantId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertActivity(dto: Dto, actor: RequestUser) {
    return this.prisma.contractActivity.create({ data: { tenantId: actor.tenantId, contractId: dto.contractId as string, actType: (dto.actType as string) ?? 'note', content: dto.content as string | undefined, data: dto.data as object | undefined, iamActorId: actor.id } });
  }

  async deleteActivity(id: string, actor: RequestUser) {
    await this.prisma.contractActivity.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Activity deleted' };
  }

  // ── ContractAppendix ───────────────────────────────────────────────────────

  async listAppendices(contractId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.contractAppendix.findMany({ where: { contractId, deletedAt: null }, skip: (page - 1) * limit, take: limit }),
      this.prisma.contractAppendix.count({ where: { contractId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getAppendix(id: string) { return this.prisma.contractAppendix.findUnique({ where: { id } }); }

  async upsertAppendix(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.contractAppendix.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.contractAppendix.create({ data: { tenantId: actor.tenantId, contractId: dto.contractId as string, title: dto.title as string, code: dto.code as string | undefined, content: dto.content as string | undefined, status: (dto.status as string) ?? 'draft', createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteAppendix(id: string, actor: RequestUser) {
    await this.prisma.contractAppendix.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Appendix deleted' };
  }

  // ── ContractPayment ────────────────────────────────────────────────────────

  async listPayments(contractId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.contractPayment.findMany({ where: { contractId, deletedAt: null }, skip: (page - 1) * limit, take: limit }),
      this.prisma.contractPayment.count({ where: { contractId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertPayment(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.contractPayment.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.contractPayment.create({ data: { tenantId: actor.tenantId, contractId: dto.contractId as string, amount: dto.amount as unknown as never, paymentDate: dto.paymentDate ? new Date(dto.paymentDate as string) : undefined, dueDate: dto.dueDate ? new Date(dto.dueDate as string) : undefined, status: (dto.status as string) ?? 'pending', note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deletePayment(id: string, actor: RequestUser) {
    await this.prisma.contractPayment.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Payment deleted' };
  }

  // ── ContractExchange ───────────────────────────────────────────────────────

  async listExchanges(contractId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.contractExchange.findMany({ where: { contractId, deletedAt: null }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.contractExchange.count({ where: { contractId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async addExchange(dto: Dto, actor: RequestUser) {
    return this.prisma.contractExchange.create({ data: { tenantId: actor.tenantId, contractId: dto.contractId as string, iamAuthorId: actor.id, content: dto.content as string | undefined, mediaUrls: dto.mediaUrls as object | undefined } });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.contractExchange.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Exchange deleted' };
  }

  // ── Export/Import ──────────────────────────────────────────────────────────

  getExportAttributes() { return { attributes: ['code', 'title', 'status', 'totalValue', 'customerId', 'contractDate'] }; }
  getImportTemplate() { return { url: '/templates/contract-import.xlsx' }; }
  autoProcessImport(dto: Dto) { return { processed: true, data: dto }; }
  getLogValues(id: string) { return this.prisma.contractActivity.findMany({ where: { contractId: id }, orderBy: { createdAt: 'desc' } }); }
  getPlaceholder(tenantId: string) { return { fields: ['{{customer_name}}', '{{contract_code}}', '{{total_value}}', '{{expiry_date}}'] }; }
  getProductsSelect(tenantId: string) { return this.prisma.product.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true, code: true, price: true }, take: 100 }); }
  getSuppliersSelect(tenantId: string) { return { data: [], total: 0 }; }
  getReport(tenantId: string) { return this.dashboardDealValue(tenantId); }
  getRevenueByDashboard(tenantId: string) { return this.dashboardDealValue(tenantId); }
  getTotalDashboard(tenantId: string) { return this.dashboardByStatus(tenantId); }
  exportRandomContracts(dto: Dto) { return { url: `/exports/contracts-${Date.now()}.xlsx` }; }
}
