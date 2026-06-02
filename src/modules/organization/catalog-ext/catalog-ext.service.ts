import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type Dto = Record<string, unknown>;

@Injectable()
export class CatalogExtService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  private async crudList<T>(
    model: { findMany: (args: unknown) => Promise<T[]>; count: (args: unknown) => Promise<number> },
    where: Record<string, unknown>,
    page = 1,
    limit = 20,
    orderBy: Record<string, unknown> = { createdAt: 'desc' },
  ) {
    const [data, total] = await Promise.all([
      model.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy }),
      model.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  // ── Career ─────────────────────────────────────────────────────────────────

  async listCareers(tenantId: string, q?: Dto) {
    return this.prisma.career.findMany({ where: { ...this.baseWhere(tenantId), ...(q?.keyword ? { name: { contains: q.keyword as string, mode: 'insensitive' } } : {}) }, orderBy: { position: 'asc' } });
  }

  async upsertCareer(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.career.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.career.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCareer(id: string, actor: RequestUser) {
    await this.prisma.career.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Position ───────────────────────────────────────────────────────────────

  async listPositions(tenantId: string, q?: Dto) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (q?.departmentId) where.departmentId = q.departmentId;
    return this.prisma.position.findMany({ where, orderBy: { level: 'asc' } });
  }

  async upsertPosition(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.position.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.position.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, level: (dto.level as number) ?? 0, departmentId: dto.departmentId as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deletePosition(id: string, actor: RequestUser) {
    await this.prisma.position.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Competency ─────────────────────────────────────────────────────────────

  async listCompetencies(tenantId: string) {
    return this.prisma.competency.findMany({ where: this.baseWhere(tenantId), orderBy: { name: 'asc' } });
  }

  async upsertCompetency(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.competency.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.competency.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCompetency(id: string, actor: RequestUser) {
    await this.prisma.competency.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Building ───────────────────────────────────────────────────────────────

  async listBuildings(tenantId: string, page = 1, limit = 20) {
    return this.crudList(this.prisma.building as never, this.baseWhere(tenantId), page, limit, { name: 'asc' } as never);
  }

  async upsertBuilding(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.building.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.building.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, address: dto.address as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteBuilding(id: string, actor: RequestUser) {
    await this.prisma.building.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listFloors(buildingId: string, tenantId: string) {
    return this.prisma.buildingFloor.findMany({ where: { buildingId, tenantId, deletedAt: null }, orderBy: { floorNo: 'asc' } });
  }

  async upsertFloor(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.buildingFloor.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.buildingFloor.create({ data: { tenantId: actor.tenantId, buildingId: dto.buildingId as string, name: dto.name as string, floorNo: (dto.floorNo as number) ?? 1, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteFloor(id: string, actor: RequestUser) {
    await this.prisma.buildingFloor.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── CodeSequence ───────────────────────────────────────────────────────────

  async listCodeSequences(tenantId: string) {
    return this.prisma.codeSequence.findMany({ where: this.baseWhere(tenantId) });
  }

  async getCodeSequence(id: string) {
    return this.prisma.codeSequence.findUnique({ where: { id } });
  }

  async getCodeSequenceByEntity(tenantId: string, entityName: string) {
    return this.prisma.codeSequence.findFirst({ where: { tenantId, entityName } });
  }

  async upsertCodeSequence(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.codeSequence.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.codeSequence.create({ data: { tenantId: actor.tenantId, entityName: dto.entityName as string, prefix: dto.prefix as string | undefined, suffix: dto.suffix as string | undefined, padLength: (dto.padLength as number) ?? 5, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCodeSequence(id: string, actor: RequestUser) {
    await this.prisma.codeSequence.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async generateNextCode(tenantId: string, entityName: string): Promise<string> {
    const seq = await this.prisma.codeSequence.findFirst({ where: { tenantId, entityName, deletedAt: null } });
    if (!seq) return `${entityName.toUpperCase()}-${Date.now()}`;
    const next = seq.currentNo + 1;
    await this.prisma.codeSequence.update({ where: { id: seq.id }, data: { currentNo: next } });
    const padded = String(next).padStart(seq.padLength, '0');
    return `${seq.prefix ?? ''}${padded}${seq.suffix ?? ''}`;
  }

  // ── Bank ───────────────────────────────────────────────────────────────────

  async listBanks(tenantId: string) {
    return this.prisma.bank.findMany({ where: this.baseWhere(tenantId), orderBy: { name: 'asc' } });
  }

  async upsertBank(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.bank.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.bank.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, shortName: dto.shortName as string | undefined, logoUrl: dto.logoUrl as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteBank(id: string, actor: RequestUser) {
    await this.prisma.bank.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Category ───────────────────────────────────────────────────────────────

  async listCategories(tenantId: string, type?: string, page = 1, limit = 50) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (type) where.type = type;
    return this.crudList(this.prisma.category as never, where, page, limit, { position: 'asc' } as never);
  }

  async getCategory(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id }, include: { children: { where: { deletedAt: null } }, items: { where: { deletedAt: null }, take: 20 } } });
    if (!c) throw new NotFoundException('Category', id);
    return c;
  }

  async upsertCategory(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.category.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.category.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, type: dto.type as string | undefined, parentId: dto.parentId as string | undefined, position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCategory(id: string, actor: RequestUser) {
    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listCategoryItems(categoryId: string, tenantId: string) {
    return this.prisma.categoryItem.findMany({ where: { categoryId, tenantId, deletedAt: null }, orderBy: { position: 'asc' } });
  }

  async getCategoryItem(id: string) {
    return this.prisma.categoryItem.findUnique({ where: { id } });
  }

  async upsertCategoryItem(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.categoryItem.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.categoryItem.create({ data: { tenantId: actor.tenantId, categoryId: dto.categoryId as string, name: dto.name as string, code: dto.code as string | undefined, value: dto.value as string | undefined, position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCategoryItem(id: string, actor: RequestUser) {
    await this.prisma.categoryItem.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Card ───────────────────────────────────────────────────────────────────

  async listCards(tenantId: string) {
    return this.prisma.card.findMany({ where: this.baseWhere(tenantId), include: { services: { where: { deletedAt: null } } } });
  }

  async upsertCard(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.card.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.card.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, cardType: (dto.cardType as string) ?? 'loyalty', createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCard(id: string, actor: RequestUser) {
    await this.prisma.card.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listCardServices(tenantId: string, cardId?: string) {
    return this.prisma.cardServiceDef.findMany({ where: { tenantId, deletedAt: null, ...(cardId ? { cardId } : {}) }, orderBy: { name: 'asc' } });
  }

  async getCardService(id: string) {
    return this.prisma.cardServiceDef.findUnique({ where: { id } });
  }

  async upsertCardService(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.cardServiceDef.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.cardServiceDef.create({ data: { tenantId: actor.tenantId, cardId: dto.cardId as string, name: dto.name as string, code: dto.code as string | undefined, sessions: dto.sessions as number | undefined, validDays: dto.validDays as number | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCardService(id: string, actor: RequestUser) {
    await this.prisma.cardServiceDef.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Product ────────────────────────────────────────────────────────────────

  async listProducts(tenantId: string, q?: Dto, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (q?.keyword) where.name = { contains: q.keyword as string, mode: 'insensitive' };
    if (q?.categoryId) where.categoryId = q.categoryId;
    return this.crudList(this.prisma.product as never, where, page, limit);
  }

  async getProduct(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product', id);
    return p;
  }

  async upsertProduct(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.product.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    return this.prisma.product.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, sku: dto.sku as string | undefined, categoryId: dto.categoryId as string | undefined, unitId: dto.unitId as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteProduct(id: string, actor: RequestUser) {
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Service ────────────────────────────────────────────────────────────────

  async listServices(tenantId: string, q?: Dto, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (q?.keyword) where.name = { contains: q.keyword as string, mode: 'insensitive' };
    if (q?.categoryId) where.categoryId = q.categoryId;
    return this.crudList(this.prisma.serviceItem as never, where, page, limit);
  }

  async getService(id: string) {
    return this.prisma.serviceItem.findUnique({ where: { id } });
  }

  async upsertService(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.serviceItem.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    return this.prisma.serviceItem.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, categoryId: dto.categoryId as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteService(id: string, actor: RequestUser) {
    await this.prisma.serviceItem.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Unit ───────────────────────────────────────────────────────────────────

  async listUnits(tenantId: string) {
    return this.prisma.unit.findMany({ where: this.baseWhere(tenantId), orderBy: { name: 'asc' } });
  }

  async upsertUnit(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.unit.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.unit.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteUnit(id: string, actor: RequestUser) {
    await this.prisma.unit.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Cashbook ───────────────────────────────────────────────────────────────

  async listCashbooks(tenantId: string, q?: Dto, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (q?.customerId) where.customerId = q.customerId;
    if (q?.transType) where.transType = q.transType;
    if (q?.startDate) where.transDate = { gte: new Date(q.startDate as string) };
    return this.crudList(this.prisma.cashbook as never, where, page, limit, { transDate: 'desc' } as never);
  }

  async getCashbook(id: string) {
    return this.prisma.cashbook.findUnique({ where: { id } });
  }

  async upsertCashbook(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.cashbook.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.cashbook.create({ data: { tenantId: actor.tenantId, transType: (dto.transType as string) ?? 'income', amount: dto.amount as unknown as never, description: dto.description as string | undefined, customerId: dto.customerId as string | undefined, iamActorId: actor.id, note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCashbook(id: string, actor: RequestUser) {
    await this.prisma.cashbook.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async getCashbookReport(tenantId: string, q: Dto) {
    const [income, expense] = await Promise.all([
      this.prisma.cashbook.aggregate({ where: { tenantId, transType: 'income', deletedAt: null }, _sum: { amount: true } }),
      this.prisma.cashbook.aggregate({ where: { tenantId, transType: 'expense', deletedAt: null }, _sum: { amount: true } }),
    ]);
    return { totalIncome: income._sum.amount ?? 0, totalExpense: expense._sum.amount ?? 0 };
  }

  async getCashbookStatistic(tenantId: string) {
    return this.getCashbookReport(tenantId, {});
  }

  // ── FilterSetting ──────────────────────────────────────────────────────────

  async listFilterSettings(tenantId: string, iamUserId: string, entityType?: string) {
    const where: Record<string, unknown> = { tenantId, iamUserId, deletedAt: null };
    if (entityType) where.entityType = entityType;
    return this.prisma.filterSetting.findMany({ where });
  }

  async upsertFilterSetting(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.filterSetting.update({ where: { id }, data: { ...(dto as object), id: undefined } as any });
    return this.prisma.filterSetting.create({ data: { tenantId: actor.tenantId, iamUserId: actor.id, name: dto.name as string, entityType: dto.entityType as string, filterData: dto.filterData as object, isDefault: (dto.isDefault as boolean) ?? false } });
  }

  async deleteFilterSetting(id: string) {
    await this.prisma.filterSetting.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Deleted' };
  }

  async getCustomerFilterAttributes(tenantId: string) {
    return this.prisma.customerAttribute.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  // ── Attachment ─────────────────────────────────────────────────────────────

  async listAttachments(tenantId: string, refType: string, refId: string) {
    return this.prisma.attachment.findMany({ where: { tenantId, refType, refId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async getAttachment(id: string) {
    return this.prisma.attachment.findUnique({ where: { id } });
  }

  async upsertAttachment(dto: Dto, actor: RequestUser) {
    return this.prisma.attachment.create({ data: { tenantId: actor.tenantId, refType: dto.refType as string, refId: dto.refId as string, fileName: dto.fileName as string, fileUrl: dto.fileUrl as string, fileSize: dto.fileSize as number | undefined, mimeType: dto.mimeType as string | undefined, iamAuthorId: actor.id } });
  }

  async deleteAttachment(id: string, actor: RequestUser) {
    await this.prisma.attachment.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── TipGroup/TipUser ───────────────────────────────────────────────────────

  async listTipGroups(tenantId: string) {
    return this.prisma.tipGroup.findMany({ where: this.baseWhere(tenantId), include: { employees: { where: { deletedAt: null } } } });
  }

  async upsertTipGroup(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.tipGroup.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.tipGroup.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTipGroup(id: string, actor: RequestUser) {
    await this.prisma.tipGroup.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listTipGroupEmployees(tipGroupId: string) {
    return this.prisma.tipGroupEmployee.findMany({ where: { tipGroupId, deletedAt: null } });
  }

  async upsertTipGroupEmployee(dto: Dto, actor: RequestUser) {
    return this.prisma.tipGroupEmployee.upsert({
      where: { tipGroupId_iamEmployeeId: { tipGroupId: dto.tipGroupId as string, iamEmployeeId: dto.iamEmployeeId as string } },
      create: { tenantId: actor.tenantId, tipGroupId: dto.tipGroupId as string, iamEmployeeId: dto.iamEmployeeId as string, createdBy: actor.id },
      update: { deletedAt: null },
    });
  }

  async deleteTipGroupEmployee(id: string) {
    await this.prisma.tipGroupEmployee.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Deleted' };
  }

  async listTipGroupConfigs(tipGroupId: string, tenantId: string) {
    return this.prisma.tipGroupConfig.findMany({ where: { tipGroupId, tenantId, deletedAt: null } });
  }

  async upsertTipGroupConfig(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.tipGroupConfig.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.tipGroupConfig.create({ data: { tenantId: actor.tenantId, tipGroupId: dto.tipGroupId as string, key: dto.key as string, value: dto.value as string | undefined, config: dto.config as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTipGroupConfig(id: string, actor: RequestUser) {
    await this.prisma.tipGroupConfig.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listTipUsers(tenantId: string, iamUserId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (iamUserId) where.iamUserId = iamUserId;
    return this.prisma.tipUser.findMany({ where });
  }

  async upsertTipUser(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.tipUser.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.tipUser.create({ data: { tenantId: actor.tenantId, iamUserId: (dto.iamUserId as string) ?? actor.id, key: dto.key as string, value: dto.value as string | undefined, config: dto.config as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async listTemplateEmails(tenantId: string, page = 1, limit = 20) {
    return this.crudList(this.prisma.templateEmail as never, this.baseWhere(tenantId), page, limit, { name: 'asc' } as never);
  }

  async upsertTemplateEmail(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.templateEmail.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.templateEmail.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, subject: dto.subject as string, body: dto.body as string, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTemplateEmail(id: string, actor: RequestUser) {
    await this.prisma.templateEmail.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listTemplateSms(tenantId: string, page = 1, limit = 20) {
    return this.crudList(this.prisma.templateSms as never, this.baseWhere(tenantId), page, limit, { name: 'asc' } as never);
  }

  async upsertTemplateSms(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.templateSms.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.templateSms.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, content: dto.content as string, brandNameId: dto.brandNameId as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTemplateSms(id: string, actor: RequestUser) {
    await this.prisma.templateSms.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listTemplateZalo(tenantId: string, page = 1, limit = 20) {
    return this.crudList(this.prisma.templateZalo as never, this.baseWhere(tenantId), page, limit, { name: 'asc' } as never);
  }

  async upsertTemplateZalo(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.templateZalo.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.templateZalo.create({ data: { tenantId: actor.tenantId, name: dto.name as string, templateId: dto.templateId as string | undefined, content: dto.content as string | undefined, params: dto.params as object | undefined, zaloOaId: dto.zaloOaId as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTemplateZalo(id: string, actor: RequestUser) {
    await this.prisma.templateZalo.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── EmailConfig ────────────────────────────────────────────────────────────

  async listEmailConfigs(tenantId: string) {
    return this.prisma.emailConfig.findMany({ where: this.baseWhere(tenantId) });
  }

  async upsertEmailConfig(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.emailConfig.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.emailConfig.create({ data: { tenantId: actor.tenantId, name: dto.name as string, host: dto.host as string, port: dto.port as number, fromEmail: dto.fromEmail as string, fromName: dto.fromName as string | undefined, username: dto.username as string, iamUserId: dto.iamUserId as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteEmailConfig(id: string, actor: RequestUser) {
    await this.prisma.emailConfig.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  async listWebhooks(tenantId: string) {
    return this.prisma.webhook.findMany({ where: this.baseWhere(tenantId) });
  }

  async upsertWebhook(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.webhook.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.webhook.create({ data: { tenantId: actor.tenantId, name: dto.name as string, url: dto.url as string, eventTypes: dto.eventTypes as object, headers: dto.headers as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteWebhook(id: string, actor: RequestUser) {
    await this.prisma.webhook.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  // ── CallConfig/CallActivity ────────────────────────────────────────────────

  async listCallConfigs(tenantId: string) {
    return this.prisma.callConfig.findMany({ where: this.baseWhere(tenantId) });
  }

  async getCallConfig(id: string) {
    return this.prisma.callConfig.findUnique({ where: { id } });
  }

  async upsertCallConfig(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.callConfig.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.callConfig.create({ data: { tenantId: actor.tenantId, name: dto.name as string, provider: dto.provider as string, apiUrl: dto.apiUrl as string | undefined, apiKey: dto.apiKey as string | undefined, config: dto.config as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteCallConfig(id: string, actor: RequestUser) {
    await this.prisma.callConfig.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async updateCallConfigStatus(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.callConfig.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }

  async listCallActivities(tenantId: string, q?: Dto, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (q?.customerId) where.customerId = q.customerId;
    if (q?.contactId) where.contactId = q.contactId;
    return this.crudList(this.prisma.callActivity as never, where, page, limit, { calledAt: 'desc' } as never);
  }

  async getCallActivity(id: string) {
    return this.prisma.callActivity.findUnique({ where: { id } });
  }

  async upsertCallActivity(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.callActivity.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.callActivity.create({ data: { tenantId: actor.tenantId, customerId: dto.customerId as string | undefined, contactId: dto.contactId as string | undefined, iamActorId: actor.id, callType: (dto.callType as string) ?? 'outbound', fromNumber: dto.fromNumber as string | undefined, toNumber: dto.toNumber as string | undefined, duration: dto.duration as number | undefined, status: (dto.status as string) ?? 'completed', callId: dto.callId as string | undefined, note: dto.note as string | undefined, updatedBy: actor.id } });
  }

  async makeCall(dto: Dto, actor: RequestUser) {
    const activity = await this.upsertCallActivity({ ...dto, status: 'in_progress' }, actor);
    return { callId: activity.id, status: 'calling', message: 'Call initiated' };
  }

  async hangupCall(dto: Dto, actor: RequestUser) {
    if (dto.callId) await this.prisma.callActivity.updateMany({ where: { id: dto.callId as string }, data: { status: 'completed', updatedBy: actor.id } });
    return { status: 'ended' };
  }

  async getCallHistory(customerId: string, tenantId: string, page = 1, limit = 20) {
    return this.listCallActivities(tenantId, { customerId }, page, limit);
  }

  async getCallHistoryByCallId(callId: string) {
    return this.prisma.callActivity.findFirst({ where: { callId } });
  }

  // ── Send Communication ─────────────────────────────────────────────────────

  async sendEmail(dto: Dto) {
    return { sent: true, message: 'Email queued', data: dto };
  }

  async sendSms(dto: Dto) {
    return { sent: true, message: 'SMS queued', data: dto };
  }

  async sendZalo(dto: Dto) {
    return { sent: true, message: 'Zalo message queued', data: dto };
  }
}
