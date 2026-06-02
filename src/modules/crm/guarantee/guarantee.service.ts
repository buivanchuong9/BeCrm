import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class GuaranteeService {
  constructor(private prisma: PrismaService) {}
  private bw(t: string) { return { tenantId: t, deletedAt: null }; }

  async listTypes(tenantId: string) { return this.prisma.guaranteeType.findMany({ where: this.bw(tenantId), orderBy: { name: 'asc' } }); }
  async upsertType(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.guaranteeType.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.guaranteeType.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteType(id: string, actor: RequestUser) { await this.prisma.guaranteeType.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = this.bw(tenantId);
    if (q.contractId) where.contractId = q.contractId;
    const [data, total] = await Promise.all([
      this.prisma.guarantee.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.guarantee.count({ where }),
    ]);
    return { data, total, page, limit };
  }
  async getById(id: string) { return this.prisma.guarantee.findUnique({ where: { id } }); }
  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.guarantee.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.guarantee.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, guaranteeTypeId: dto.guaranteeTypeId as string | undefined, contractId: dto.contractId as string | undefined, customerId: dto.customerId as string | undefined, status: (dto.status as string) ?? 'active', createdBy: actor.id, updatedBy: actor.id } });
  }
  async delete(id: string, actor: RequestUser) { await this.prisma.guarantee.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }
}
