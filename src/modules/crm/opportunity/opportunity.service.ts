import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class OpportunityService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    campaignId?: string; status?: string; customerId?: string;
    contactId?: string; iamOwnerId?: string; iamSaleId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.campaignId) where.campaignId = query.campaignId;
    if (query?.status) where.status = query.status;
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.contactId) where.contactId = query.contactId;
    if (query?.iamOwnerId) where.iamOwnerId = query.iamOwnerId;
    if (query?.iamSaleId) where.iamSaleId = query.iamSaleId;

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true } },
          approach: { select: { id: true, name: true, step: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getById(id: string, tenantId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        campaign: true,
        approach: true,
        source: true,
        processes: { where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } },
        exchanges: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        viewers: true,
        contacts: { where: { deletedAt: null }, include: { contact: { select: { id: true, name: true, phone: true } } } },
      },
    });
    if (!opp) throw new NotFoundException('Opportunity', id);
    return opp;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      const existing = await this.prisma.opportunity.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('Opportunity', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

      return this.prisma.opportunity.update({
        where: { id },
        data: {
          campaignId: dto.campaignId as string | undefined,
          campaignApproachId: dto.campaignApproachId as string | undefined,
          refType: dto.refType as string | undefined,
          customerId: dto.customerId as string | undefined,
          contactId: dto.contactId as string | undefined,
          iamOwnerId: dto.iamOwnerId as string | undefined,
          iamSaleId: dto.iamSaleId as string | undefined,
          crmSourceId: dto.crmSourceId as string | undefined,
          expectedRevenue: dto.expectedRevenue as number | undefined,
          startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
          percent: dto.percent as number | undefined,
          status: dto.status as string | undefined,
          note: dto.note as string | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }

    return this.prisma.opportunity.create({
      data: {
        tenantId: actor.tenantId,
        campaignId: dto.campaignId as string,
        campaignApproachId: dto.campaignApproachId as string | undefined,
        refType: (dto.refType as string) ?? 'customer',
        customerId: dto.customerId as string | undefined,
        contactId: dto.contactId as string | undefined,
        iamOwnerId: (dto.iamOwnerId as string) ?? actor.id,
        iamSaleId: dto.iamSaleId as string | undefined,
        crmSourceId: dto.crmSourceId as string | undefined,
        expectedRevenue: (dto.expectedRevenue as number) ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        percent: (dto.percent as number) ?? 0,
        status: (dto.status as string) ?? 'open',
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateBatch(ids: string[], fields: Record<string, unknown>, actor: RequestUser) {
    await this.prisma.opportunity.updateMany({
      where: { id: { in: ids }, tenantId: actor.tenantId },
      data: { ...fields, updatedBy: actor.id },
    });
    return { message: `${ids.length} opportunities updated` };
  }

  async changeEmployee(id: string, iamOwnerId: string, actor: RequestUser) {
    return this.prisma.opportunity.update({
      where: { id },
      data: { iamOwnerId, updatedBy: actor.id },
    });
  }

  async changeSale(id: string, iamSaleId: string, actor: RequestUser) {
    return this.prisma.opportunity.update({
      where: { id },
      data: { iamSaleId, updatedBy: actor.id },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Opportunity deleted' };
  }

  // Opportunity Processes
  async addProcess(dto: {
    opportunityId: string; campaignApproachId?: string;
    note?: string; percent?: number; status?: string;
  }, actor: RequestUser) {
    return this.prisma.opportunityProcess.create({
      data: {
        tenantId: actor.tenantId,
        opportunityId: dto.opportunityId,
        campaignApproachId: dto.campaignApproachId,
        note: dto.note,
        percent: dto.percent,
        status: dto.status,
        occurredAt: new Date(),
        createdBy: actor.id,
      },
    });
  }

  async deleteProcess(id: string, actor: RequestUser) {
    await this.prisma.opportunityProcess.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Process deleted' };
  }

  // Exchanges
  async listExchanges(opportunityId: string, page = 1, limit = 20) {
    return this.prisma.opportunityExchange.findMany({
      where: { opportunityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async addExchange(dto: { opportunityId: string; content?: string; contentDelta?: string; mediaUrls?: object }, actor: RequestUser) {
    return this.prisma.opportunityExchange.create({
      data: {
        tenantId: actor.tenantId,
        opportunityId: dto.opportunityId,
        iamAuthorId: actor.id,
        content: dto.content,
        contentDelta: dto.contentDelta,
        mediaUrls: dto.mediaUrls,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.opportunityExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  // Viewers
  async listViewers(opportunityId: string) {
    return this.prisma.opportunityViewer.findMany({ where: { opportunityId } });
  }

  async addViewer(dto: { opportunityId: string; iamUserId: string }, actor: RequestUser) {
    return this.prisma.opportunityViewer.upsert({
      where: { opportunityId_iamUserId: { opportunityId: dto.opportunityId, iamUserId: dto.iamUserId } },
      update: {},
      create: { tenantId: actor.tenantId, opportunityId: dto.opportunityId, iamUserId: dto.iamUserId },
    });
  }

  async deleteViewer(id: string) {
    return this.prisma.opportunityViewer.delete({ where: { id } });
  }

  // Opportunity contacts (B2B)
  async getOpportunityContact(opportunityId: string) {
    return this.prisma.opportunityContact.findMany({
      where: { opportunityId, deletedAt: null },
      include: { contact: { select: { id: true, name: true, phone: true, email: true } } },
    });
  }

  async upsertOpportunityContact(dto: { opportunityId: string; contactId: string; isPrimary?: boolean }, actor: RequestUser) {
    return this.prisma.opportunityContact.upsert({
      where: { opportunityId_contactId: { opportunityId: dto.opportunityId, contactId: dto.contactId } },
      update: { isPrimary: dto.isPrimary ?? false },
      create: {
        tenantId: actor.tenantId,
        opportunityId: dto.opportunityId,
        contactId: dto.contactId,
        isPrimary: dto.isPrimary ?? false,
        createdBy: actor.id,
      },
    });
  }

  // Statistics
  async statisticApproach(tenantId: string, campaignId: string) {
    const approaches = await this.prisma.campaignApproach.findMany({
      where: { campaignId, tenantId, deletedAt: null },
      orderBy: { step: 'asc' },
    }) as Array<{ id: string }>;
    const stats = await Promise.all(
      approaches.map(async (a) => ({
        approach: a,
        count: await this.prisma.opportunity.count({ where: { campaignApproachId: a.id, deletedAt: null } }),
      })),
    );
    return stats;
  }

  async statisticSale(tenantId: string, campaignId: string) {
    return this.prisma.opportunity.groupBy({
      by: ['iamSaleId'],
      where: { campaignId, tenantId, deletedAt: null },
      _count: { id: true },
      _sum: { expectedRevenue: true },
    });
  }

  async getDashboardTotals(tenantId: string, query?: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.startDate) where.createdAt = { gte: new Date(query.startDate) };

    return {
      total: await this.prisma.opportunity.count({ where }),
      open: await this.prisma.opportunity.count({ where: { ...where, status: 'open' } }),
      won: await this.prisma.opportunity.count({ where: { ...where, status: 'won' } }),
      lost: await this.prisma.opportunity.count({ where: { ...where, status: 'lost' } }),
    };
  }
}
