import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class ContractWarrantyService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.contractId) where.contractId = q.contractId;
    if (q.customerId) where.customerId = q.customerId;
    const [data, total] = await Promise.all([
      this.prisma.contractWarranty.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.contractWarranty.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) { return this.prisma.contractWarranty.findUnique({ where: { id } }); }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.contractWarranty.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.contractWarranty.create({ data: { tenantId: actor.tenantId, title: dto.title as string, code: dto.code as string | undefined, contractId: dto.contractId as string | undefined, customerId: dto.customerId as string | undefined, status: (dto.status as string) ?? 'active', note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.contractWarranty.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  getStatistical(tenantId: string) { return this.prisma.contractWarranty.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: { id: true } }); }
  getPlaceholder() { return { fields: ['{{contract_code}}', '{{customer_name}}', '{{warranty_title}}'] }; }
  getExportAttributes() { return { attributes: ['code', 'title', 'status', 'startDate', 'endDate'] }; }
  exportRandom(dto: Dto) { return { url: `/exports/cw-${Date.now()}.xlsx` }; }
  exportWarranty(dto: Dto) { return { url: `/exports/warranty-${Date.now()}.xlsx` }; }
  getImportTemplate() { return { url: '/templates/contract-warranty-import.xlsx' }; }
  autoProcessImport(dto: Dto) { return { processed: true }; }
}
