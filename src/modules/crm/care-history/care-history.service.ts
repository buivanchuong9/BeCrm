import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class CareHistoryService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    customerId?: string; contactId?: string; careCategoryId?: string;
    iamEmployeeId?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.contactId) where.contactId = query.contactId;
    if (query?.careCategoryId) where.careCategoryId = query.careCategoryId;
    if (query?.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;

    const [data, total] = await Promise.all([
      this.prisma.careHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      this.prisma.careHistory.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: {
    careCategoryId?: string; objectType: string;
    customerId?: string; contactId?: string;
    content?: string; status?: number; occurredAt?: Date;
  }, actor: RequestUser) {
    return this.prisma.careHistory.create({
      data: {
        tenantId: actor.tenantId,
        careCategoryId: dto.careCategoryId,
        objectType: dto.objectType,
        customerId: dto.customerId,
        contactId: dto.contactId,
        iamEmployeeId: actor.id,
        content: dto.content,
        status: dto.status ?? 0,
        occurredAt: dto.occurredAt ?? new Date(),
        createdBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.careHistory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Care history deleted' };
  }

  // Care categories
  async listCategories(tenantId: string) {
    return this.prisma.careCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertCategory(dto: { id?: string; name: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.careCategory.update({
        where: { id: dto.id },
        data: { name: dto.name, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.careCategory.create({
      data: { tenantId: actor.tenantId, name: dto.name, position: dto.position ?? 0, createdBy: actor.id, updatedBy: actor.id },
    });
  }

  async deleteCategory(id: string, actor: RequestUser) {
    await this.prisma.careCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Care category deleted' };
  }
}
