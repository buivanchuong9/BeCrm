import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class MarketingAutomationService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; status?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.marketingAutomation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { customers: true, nodes: true } },
        },
      }),
      this.prisma.marketingAutomation.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const ma = await this.prisma.marketingAutomation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        nodes: { where: { deletedAt: null } },
        mappings: true,
      },
    });
    if (!ma) throw new NotFoundException('MarketingAutomation', id);
    return ma;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      const existing = await this.prisma.marketingAutomation.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('MarketingAutomation', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

      return this.prisma.marketingAutomation.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          status: dto.status as string | undefined,
          triggerConfig: dto.triggerConfig as object | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.marketingAutomation.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        status: (dto.status as string) ?? 'draft',
        triggerConfig: dto.triggerConfig as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.marketingAutomation.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Marketing automation deleted' };
  }

  async addCustomers(marketingAutomationId: string, customerIds: string[], actor: RequestUser) {
    await this.prisma.maCustomer.createMany({
      data: customerIds.map((customerId) => ({
        tenantId: actor.tenantId,
        marketingAutomationId,
        customerId,
        status: 'enrolled',
        createdBy: actor.id,
      })),
      skipDuplicates: true,
    });
    return { message: `${customerIds.length} customers enrolled` };
  }

  async getDashboardByStatus(tenantId: string, marketingAutomationId: string) {
    return this.prisma.maCustomer.groupBy({
      by: ['status'],
      where: { marketingAutomationId, tenantId, deletedAt: null },
      _count: { id: true },
    });
  }

  async listMaMappings(tenantId: string) {
    return this.prisma.maMapping.findMany({ where: { tenantId } });
  }

  async upsertMaMapping(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.maMapping.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    }
    const mappingConfig =
      (dto.mappingConfig as object | undefined) ??
      (dto.fieldKey || dto.sourceField || dto.targetField
        ? {
            ...(dto.fieldKey ? { fieldKey: dto.fieldKey as string } : {}),
            ...(dto.sourceField ? { sourceField: dto.sourceField as string } : {}),
            ...(dto.targetField ? { targetField: dto.targetField as string } : {}),
          }
        : undefined);
    return this.prisma.maMapping.create({
      data: {
        tenantId: actor.tenantId,
        marketingAutomationId: dto.marketingAutomationId as string,
        campaignId: dto.campaignId as string | undefined,
        mappingConfig,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteMaMapping(id: string, actor: RequestUser) {
    await this.prisma.maMapping.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async listMaCustomers(tenantId: string, marketingAutomationId?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (marketingAutomationId) where.marketingAutomationId = marketingAutomationId;
    return this.prisma.maCustomer.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async deleteMaCustomer(id: string, actor: RequestUser) {
    await this.prisma.maCustomer.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Deleted' };
  }
}
