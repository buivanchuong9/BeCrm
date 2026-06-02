import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class BusinessPartnerService {
  constructor(private prisma: PrismaService) {}
  private bw(tenantId: string) { return { tenantId, deletedAt: null }; }

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.bw(tenantId);
    if (q.keyword || q.name) where.name = { contains: (q.keyword ?? q.name) as string, mode: 'insensitive' };
    if (q.iamEmployeeId) where.iamEmployeeId = q.iamEmployeeId;
    const [data, total] = await Promise.all([
      this.prisma.businessPartner.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.businessPartner.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const bp = await this.prisma.businessPartner.findFirst({ where: { id, ...this.bw(tenantId) } });
    if (!bp) throw new NotFoundException('BusinessPartner', id);
    return bp;
  }

  async getPhone(id: string) { const bp = await this.prisma.businessPartner.findUnique({ where: { id }, select: { phone: true } }); return { phone: bp?.phone }; }
  async getEmail(id: string) { const bp = await this.prisma.businessPartner.findUnique({ where: { id }, select: { email: true } }); return { email: bp?.email }; }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.businessPartner.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    return this.prisma.businessPartner.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, taxCode: dto.taxCode as string | undefined, phone: dto.phone as string | undefined, email: dto.email as string | undefined, address: dto.address as string | undefined, iamEmployeeId: dto.iamEmployeeId as string | undefined, note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.businessPartner.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listFilter(tenantId: string) { return this.prisma.businessPartner.findMany({ where: this.bw(tenantId), select: { id: true, name: true, phone: true, email: true }, take: 100 }); }
  getExportAttributes() { return { attributes: ['code', 'name', 'taxCode', 'phone', 'email', 'address'] }; }
  getImportTemplate() { return { url: '/templates/business-partner-import.xlsx' }; }
  autoProcessImport(dto: Dto) { return { processed: true }; }
  exportRandom(dto: Dto) { return { url: `/exports/bp-${Date.now()}.xlsx` }; }

  async listAttributes(tenantId: string) { return this.prisma.objectAttribute.findMany({ where: { tenantId, objectType: 'business_partner', deletedAt: null } }); }
  async listAllAttributes(tenantId: string) { return this.listAttributes(tenantId); }
  async upsertAttribute(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.objectAttribute.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.objectAttribute.create({ data: { tenantId: actor.tenantId, objectType: 'business_partner', fieldKey: dto.fieldKey as string, fieldLabel: dto.fieldLabel as string, fieldType: (dto.fieldType as string) ?? 'text', position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteAttribute(id: string, actor: RequestUser) { await this.prisma.objectAttribute.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }
  async checkDuplicatedAttribute(tenantId: string, fieldKey: string) { const count = await this.prisma.objectAttribute.count({ where: { tenantId, objectType: 'business_partner', fieldKey } }); return { isDuplicated: count > 0 }; }

  async listExchanges(businessPartnerId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.businessPartnerExchange.findMany({ where: { businessPartnerId, deletedAt: null }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.businessPartnerExchange.count({ where: { businessPartnerId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async addExchange(dto: Dto, actor: RequestUser) {
    return this.prisma.businessPartnerExchange.create({ data: { tenantId: actor.tenantId, businessPartnerId: dto.businessPartnerId as string, iamAuthorId: actor.id, content: dto.content as string | undefined, mediaUrls: dto.mediaUrls as object | undefined } });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.businessPartnerExchange.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listExtraInfos(businessPartnerId: string) { return []; }
}
