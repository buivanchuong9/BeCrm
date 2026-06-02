import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    name?: string; status?: string; type?: string;
    iamOwnerId?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.status) where.status = query.status;
    if (query?.type) where.type = query.type;
    if (query?.iamOwnerId) where.iamOwnerId = query.iamOwnerId;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          approaches: { where: { deletedAt: null }, orderBy: { step: 'asc' } },
          _count: { select: { opportunities: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        approaches: {
          where: { deletedAt: null },
          orderBy: { step: 'asc' },
          include: { activities_: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
        },
        sales: { where: { deletedAt: null } },
        scoreConfigs: true,
        slaConfigs: true,
      },
    });
    if (!campaign) throw new NotFoundException('Campaign', id);
    return campaign;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      const existing = await this.prisma.campaign.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('Campaign', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

      return this.prisma.campaign.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          type: dto.type as string | undefined,
          status: dto.status as string | undefined,
          saleDistributionType: dto.saleDistributionType as string | undefined,
          divisionMethod: dto.divisionMethod as number | undefined,
          coverUrl: dto.coverUrl as string | undefined,
          startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
          position: dto.position as number | undefined,
          iamOwnerId: dto.iamOwnerId as string | undefined,
          approachNote: dto.approachNote as string | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }

    return this.prisma.campaign.create({
      data: {
        tenantId: actor.tenantId,
        code: (dto.code as string) ?? `C-${Date.now()}`,
        name: dto.name as string,
        type: dto.type as string | undefined,
        status: (dto.status as string) ?? 'draft',
        saleDistributionType: dto.saleDistributionType as string | undefined,
        divisionMethod: dto.divisionMethod as number | undefined,
        coverUrl: dto.coverUrl as string | undefined,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        position: (dto.position as number) ?? 0,
        iamOwnerId: (dto.iamOwnerId as string) ?? actor.id,
        approachNote: dto.approachNote as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateStatus(id: string, status: string, actor: RequestUser) {
    return this.prisma.campaign.update({
      where: { id },
      data: { status, updatedBy: actor.id },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Campaign deleted' };
  }

  // Approaches
  async listApproaches(campaignId: string, tenantId: string) {
    return this.prisma.campaignApproach.findMany({
      where: { campaignId, tenantId, deletedAt: null },
      orderBy: { step: 'asc' },
      include: { activities_: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
    });
  }

  async getApproachById(id: string) {
    const approach = await this.prisma.campaignApproach.findUnique({ where: { id } });
    if (!approach) throw new NotFoundException('CampaignApproach', id);
    return approach;
  }

  async upsertApproach(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.campaignApproach.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          step: dto.step as number | undefined,
          slaHours: dto.slaHours as number | undefined,
          activities: dto.activities as object | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.campaignApproach.create({
      data: {
        tenantId: actor.tenantId,
        campaignId: dto.campaignId as string,
        name: dto.name as string,
        step: (dto.step as number) ?? 1,
        slaHours: dto.slaHours as number | undefined,
        activities: dto.activities as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteApproach(id: string, actor: RequestUser) {
    await this.prisma.campaignApproach.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Approach deleted' };
  }

  // Activities
  async listActivities(campaignApproachId: string) {
    return this.prisma.campaignActivity.findMany({
      where: { campaignApproachId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertActivity(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.campaignActivity.update({
        where: { id },
        data: { name: dto.name as string | undefined, position: dto.position as number | undefined, config: dto.config as object | undefined },
      });
    }
    return this.prisma.campaignActivity.create({
      data: {
        tenantId: actor.tenantId,
        campaignApproachId: dto.campaignApproachId as string,
        name: dto.name as string,
        position: (dto.position as number) ?? 0,
        config: dto.config as object | undefined,
        createdBy: actor.id,
      },
    });
  }

  async deleteActivity(id: string) {
    await this.prisma.campaignActivity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Activity deleted' };
  }

  // Campaign Sales
  async listSales(campaignId: string, tenantId: string) {
    return this.prisma.campaignSale.findMany({
      where: { campaignId, tenantId, deletedAt: null },
    });
  }

  // SLA Config
  async updateSlaConfig(
    dto: {
      campaignId: string;
      campaignApproachId?: string;
      slaHours: number;
      escalationRule?: object;
    },
    actor: RequestUser,
  ) {
    const existing = await this.prisma.campaignSlaConfig.findFirst({
      where: {
        campaignId: dto.campaignId,
        campaignApproachId: dto.campaignApproachId ?? null,
      },
    });
    if (existing) {
      return this.prisma.campaignSlaConfig.update({
        where: { id: existing.id },
        data: { slaHours: dto.slaHours, escalationRule: dto.escalationRule, updatedBy: actor.id },
      });
    }
    return this.prisma.campaignSlaConfig.create({
      data: {
        tenantId: actor.tenantId,
        campaignId: dto.campaignId,
        campaignApproachId: dto.campaignApproachId,
        slaHours: dto.slaHours,
        escalationRule: dto.escalationRule,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  // Marketing Sources
  async listMarketingSources(tenantId: string) {
    return this.prisma.marketingSource.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertMarketingSource(dto: { id?: string; name: string; sourceType?: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.marketingSource.update({
        where: { id: dto.id },
        data: { name: dto.name, sourceType: dto.sourceType, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.marketingSource.create({
      data: { tenantId: actor.tenantId, name: dto.name, sourceType: dto.sourceType, position: dto.position ?? 0, createdBy: actor.id, updatedBy: actor.id },
    });
  }

  async deleteMarketingSource(id: string, actor: RequestUser) {
    await this.prisma.marketingSource.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Marketing source deleted' };
  }
}
