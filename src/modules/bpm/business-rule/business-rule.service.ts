import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BusinessRuleService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; isActive?: boolean; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    const [data, total] = await Promise.all([
      this.prisma.businessRule.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { items: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
      }),
      this.prisma.businessRule.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const rule = await this.prisma.businessRule.findUnique({
      where: { id },
      include: { items: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
    });
    if (!rule) throw new NotFoundException('BusinessRule', id);
    return rule;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.businessRule.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          isActive: dto.isActive as boolean | undefined,
          config: dto.config as object | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.businessRule.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateActive(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.businessRule.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.businessRule.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Business rule deleted' };
  }

  // Items
  async listItems(businessRuleId: string) {
    return this.prisma.businessRuleItem.findMany({
      where: { businessRuleId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertItem(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.businessRuleItem.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          condition: dto.condition as object | undefined,
          action: dto.action as object | undefined,
          position: dto.position as number | undefined,
          isActive: dto.isActive as boolean | undefined,
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.businessRuleItem.create({
      data: {
        tenantId: actor.tenantId,
        businessRuleId: dto.businessRuleId as string,
        name: dto.name as string,
        condition: dto.condition as object | undefined,
        action: dto.action as object | undefined,
        position: (dto.position as number) ?? 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateItemActive(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.businessRuleItem.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }

  async deleteItem(id: string, actor: RequestUser) {
    await this.prisma.businessRuleItem.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Business rule item deleted' };
  }
}
