import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.customerId) where.customerId = q.customerId;
    if (q.status) where.status = q.status;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!inv) throw new NotFoundException('Invoice', id);
    return inv;
  }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.invoice.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.invoice.create({ data: { tenantId: actor.tenantId, code: dto.code as string | undefined, customerId: dto.customerId as string | undefined, contractId: dto.contractId as string | undefined, saleflowId: dto.saleflowId as string | undefined, iamOwnerId: dto.iamOwnerId as string | undefined, status: (dto.status as string) ?? 'draft', note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async upsertDetail(dto: Dto, actor: RequestUser) {
    return this.prisma.invoiceDetail.create({ data: { tenantId: actor.tenantId, invoiceId: dto.invoiceId as string, itemName: dto.itemName as string, itemCode: dto.itemCode as string | undefined, quantity: dto.quantity as unknown as never, unitPrice: dto.unitPrice as unknown as never, totalAmount: dto.totalAmount as unknown as never, note: dto.note as string | undefined } });
  }

  async deleteDetail(id: string) {
    await this.prisma.invoiceDetail.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
