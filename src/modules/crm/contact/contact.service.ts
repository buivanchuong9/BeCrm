import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    name?: string; phone?: string; email?: string;
    contactPipelineId?: string; contactStatusId?: string; iamOwnerId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.phone) where.phone = { contains: query.phone };
    if (query?.email) where.email = { contains: query.email, mode: 'insensitive' };
    if (query?.contactPipelineId) where.contactPipelineId = query.contactPipelineId;
    if (query?.contactStatusId) where.contactStatusId = query.contactStatusId;
    if (query?.iamOwnerId) where.iamOwnerId = query.iamOwnerId;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pipeline: { select: { id: true, name: true } },
          status: { select: { id: true, name: true, colorHex: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        pipeline: true,
        status: true,
        extraInfos: { include: { attributeDef: true } },
        customerLinks: { where: { deletedAt: null } },
      },
    });
    if (!contact) throw new NotFoundException('Contact', id);
    return contact;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = { ...dto, id: undefined };

    if (id) {
      const existing = await this.prisma.contact.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('Contact', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) {
        throw new OptimisticLockException();
      }
      return this.prisma.contact.update({
        where: { id },
        data: { ...data, rowVersion: { increment: 1 }, updatedBy: actor.id },
      });
    }
    return this.prisma.contact.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        phone: dto.phone as string | undefined,
        email: dto.email as string | undefined,
        note: dto.note as string | undefined,
        avatarUrl: dto.avatarUrl as string | undefined,
        cardVisitFrontUrl: dto.cardVisitFrontUrl as string | undefined,
        cardVisitBackUrl: dto.cardVisitBackUrl as string | undefined,
        department: dto.department as string | undefined,
        iamOwnerId: dto.iamOwnerId as string | undefined,
        contactPipelineId: dto.contactPipelineId as string | undefined,
        contactStatusId: dto.contactStatusId as string | undefined,
        primaryCustomerId: dto.primaryCustomerId as string | undefined,
        extraAttributes: dto.extraAttributes as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Contact deleted' };
  }

  // Contact pipelines
  async listPipelines(tenantId: string) {
    return this.prisma.contactPipeline.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: { statuses: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
    });
  }

  async upsertPipeline(dto: { id?: string; name: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.contactPipeline.update({
        where: { id: dto.id },
        data: { name: dto.name, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.contactPipeline.create({
      data: { tenantId: actor.tenantId, name: dto.name, position: dto.position ?? 0, createdBy: actor.id, updatedBy: actor.id },
    });
  }

  async deletePipeline(id: string, actor: RequestUser) {
    await this.prisma.contactPipeline.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Pipeline deleted' };
  }

  // Contact statuses
  async listStatuses(tenantId: string, pipelineId?: string) {
    return this.prisma.contactStatus.findMany({
      where: { tenantId, deletedAt: null, ...(pipelineId ? { contactPipelineId: pipelineId } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertStatus(
    dto: { id?: string; contactPipelineId: string; name: string; position?: number; colorHex?: string },
    actor: RequestUser,
  ) {
    if (dto.id) {
      return this.prisma.contactStatus.update({
        where: { id: dto.id },
        data: { name: dto.name, position: dto.position ?? 0, colorHex: dto.colorHex, updatedBy: actor.id },
      });
    }
    return this.prisma.contactStatus.create({
      data: {
        tenantId: actor.tenantId,
        contactPipelineId: dto.contactPipelineId,
        name: dto.name,
        position: dto.position ?? 0,
        colorHex: dto.colorHex,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteStatus(id: string, actor: RequestUser) {
    await this.prisma.contactStatus.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Status deleted' };
  }

  // Contact attributes
  async listAttributes(tenantId: string) {
    return this.prisma.contactAttributeDefinition.findMany({
      where: { tenantId, deletedAt: null, parentId: null },
      include: { children: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
  }

  async upsertAttribute(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.contactAttributeDefinition.update({
        where: { id },
        data: { ...(dto as Record<string, unknown>), id: undefined, updatedBy: actor.id },
      });
    }
    return this.prisma.contactAttributeDefinition.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        fieldName: dto.fieldName as string,
        dataType: (dto.dataType as string) ?? 'text',
        isRequired: (dto.isRequired as boolean) ?? false,
        isReadonly: (dto.isReadonly as boolean) ?? false,
        isUnique: (dto.isUnique as boolean) ?? false,
        options: dto.options as object | undefined,
        numberFormat: dto.numberFormat as string | undefined,
        position: (dto.position as number) ?? 0,
        parentId: dto.parentId as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteAttribute(id: string, actor: RequestUser) {
    await this.prisma.contactAttributeDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Attribute deleted' };
  }

  async listExtraInfos(contactId: string) {
    return this.prisma.contactExtraInfo.findMany({
      where: { contactId },
      include: { attributeDef: true },
    });
  }

  // Contact exchanges
  async listExchanges(contactId: string, page = 1, limit = 20) {
    return this.prisma.contactExchange.findMany({
      where: { contactId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async addExchange(dto: { contactId: string; content?: string; contentDelta?: string; mediaUrls?: object }, actor: RequestUser) {
    return this.prisma.contactExchange.create({
      data: {
        tenantId: actor.tenantId,
        contactId: dto.contactId,
        iamAuthorId: actor.id,
        content: dto.content,
        contentDelta: dto.contentDelta,
        mediaUrls: dto.mediaUrls,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.contactExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  async getAttributeFilterList(tenantId: string) {
    return this.prisma.contactAttributeDefinition.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, fieldName: true, dataType: true, options: true },
      orderBy: { position: 'asc' },
    });
  }
}
