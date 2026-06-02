import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class SaleflowService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.customerId) where.customerId = q.customerId;
    if (q.status) where.status = q.status;
    if (q.iamOwnerId) where.iamOwnerId = q.iamOwnerId;
    const [data, total] = await Promise.all([
      this.prisma.saleflow.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.saleflow.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const s = await this.prisma.saleflow.findFirst({ where: { id, tenantId, deletedAt: null }, include: { activities: { orderBy: { createdAt: 'desc' }, take: 10 } } });
    if (!s) throw new NotFoundException('Saleflow', id);
    return s;
  }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.saleflow.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    return this.prisma.saleflow.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, customerId: dto.customerId as string | undefined, contactId: dto.contactId as string | undefined, iamOwnerId: dto.iamOwnerId as string | undefined, status: (dto.status as string) ?? 'open', note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.saleflow.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async addActivity(dto: Dto, actor: RequestUser) {
    return this.prisma.saleflowActivity.create({ data: { tenantId: actor.tenantId, saleflowId: dto.saleflowId as string, actType: (dto.actType as string) ?? 'note', content: dto.content as string | undefined, data: dto.data as object | undefined, iamActorId: actor.id } });
  }

  async deleteActivity(id: string) {
    await this.prisma.saleflowActivity.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Deleted' };
  }

  async addExchange(dto: Dto, actor: RequestUser) {
    return this.prisma.saleflowExchange.create({ data: { tenantId: actor.tenantId, saleflowId: dto.saleflowId as string, iamAuthorId: actor.id, content: dto.content as string | undefined, mediaUrls: dto.mediaUrls as object | undefined } });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.saleflowExchange.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }
}
