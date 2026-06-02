import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../shared/exceptions/domain.exception';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@Injectable()
export class WarrantyService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    customerId?: string; status?: number; statusId?: string;
    reasonId?: string; iamEmployeeId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.status !== undefined) where.status = query.status;
    if (query?.statusId) where.statusId = query.statusId;
    if (query?.reasonId) where.reasonId = query.reasonId;
    if (query?.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;

    const [data, total] = await Promise.all([
      this.prisma.warranty.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warrantyStatus: { select: { id: true, name: true, colorHex: true } },
          warrantyReason: { select: { id: true, name: true } },
          procedure: { select: { id: true, name: true } },
        },
      }),
      this.prisma.warranty.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        warrantyStatus: true,
        warrantyReason: true,
        procedure: { include: { steps: { where: { deletedAt: null } } } },
        exchanges: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        viewers: true,
        processes: { where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } },
        supportObjects: {
          where: { deletedAt: null },
          include: { step: true, logs: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });
    if (!warranty) throw new NotFoundException('Warranty', id);
    return warranty;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      const existing = await this.prisma.warranty.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('Warranty', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

      return this.prisma.warranty.update({
        where: { id },
        data: {
          title: dto.title as string | undefined,
          content: dto.content as string | undefined,
          customerId: dto.customerId as string | undefined,
          phone: dto.phone as string | undefined,
          statusId: dto.statusId as string | undefined,
          reasonId: dto.reasonId as string | undefined,
          procedureId: dto.procedureId as string | undefined,
          iamEmployeeId: dto.iamEmployeeId as string | undefined,
          startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
          note: dto.note as string | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }

    return this.prisma.warranty.create({
      data: {
        tenantId: actor.tenantId,
        code: `W-${Date.now()}`,
        title: dto.title as string,
        content: dto.content as string | undefined,
        customerId: dto.customerId as string | undefined,
        phone: dto.phone as string | undefined,
        statusId: dto.statusId as string | undefined,
        reasonId: dto.reasonId as string | undefined,
        procedureId: dto.procedureId as string | undefined,
        iamEmployeeId: (dto.iamEmployeeId as string) ?? actor.id,
        iamCreatorId: actor.id,
        status: 0,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateStatus(id: string, status: number, actor: RequestUser) {
    return this.prisma.warranty.update({
      where: { id },
      data: { status, updatedBy: actor.id },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.warranty.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Warranty deleted' };
  }

  // Exchanges
  async listExchanges(warrantyId: string, page = 1, limit = 20) {
    return this.prisma.warrantyExchange.findMany({
      where: { warrantyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async addExchange(dto: { warrantyId: string; content?: string; contentDelta?: string; mediaUrls?: object }, actor: RequestUser) {
    return this.prisma.warrantyExchange.create({
      data: {
        tenantId: actor.tenantId,
        warrantyId: dto.warrantyId,
        iamAuthorId: actor.id,
        content: dto.content,
        contentDelta: dto.contentDelta,
        mediaUrls: dto.mediaUrls,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.warrantyExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  // Categories (statuses & reasons)
  async listCategories(tenantId: string, categoryType?: number) {
    return this.prisma.warrantyCategory.findMany({
      where: { tenantId, deletedAt: null, ...(categoryType !== undefined ? { categoryType } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertCategory(dto: { id?: string; name: string; categoryType: number; colorHex?: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.warrantyCategory.update({
        where: { id: dto.id },
        data: { name: dto.name, colorHex: dto.colorHex, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.warrantyCategory.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        categoryType: dto.categoryType,
        colorHex: dto.colorHex,
        position: dto.position ?? 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteCategory(id: string, actor: RequestUser) {
    await this.prisma.warrantyCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Warranty category deleted' };
  }

  // Support objects (warranty execution)
  async receiveSupportObject(id: string, note: string | undefined, actor: RequestUser) {
    await this.prisma.warrantySupportObject.update({
      where: { id },
      data: { status: 1, iamAssigneeId: actor.id, updatedBy: actor.id },
    });
    await this.prisma.warrantySupportLog.create({
      data: { tenantId: actor.tenantId, warrantySupportObjectId: id, iamActorId: actor.id, action: 1, status: 1, note, createdBy: actor.id },
    });
    return { message: 'Warranty support object received' };
  }

  async processDoneSupportObject(id: string, note: string | undefined, actor: RequestUser) {
    await this.prisma.warrantySupportObject.update({ where: { id }, data: { status: 2, updatedBy: actor.id } });
    await this.prisma.warrantySupportLog.create({
      data: { tenantId: actor.tenantId, warrantySupportObjectId: id, iamActorId: actor.id, action: 2, status: 2, note, createdBy: actor.id },
    });
    return { message: 'Warranty support object completed' };
  }
}
