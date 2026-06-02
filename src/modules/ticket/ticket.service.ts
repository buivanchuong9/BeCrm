import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../shared/exceptions/domain.exception';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    customerId?: string; status?: number; categoryId?: string;
    iamEmployeeId?: string; iamDepartmentId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.status !== undefined) where.status = query.status;
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;
    if (query?.iamDepartmentId) where.iamDepartmentId = query.iamDepartmentId;

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          procedure: { select: { id: true, name: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        procedure: { include: { steps: { where: { deletedAt: null } } } },
        exchanges: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        viewers: true,
        supportObjects: {
          where: { deletedAt: null },
          include: { step: true, logs: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket', id);
    return ticket;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      const existing = await this.prisma.ticket.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('Ticket', id);
      if (dto.rowVersion && existing.rowVersion !== Number(dto.rowVersion)) throw new OptimisticLockException();

      return this.prisma.ticket.update({
        where: { id },
        data: {
          title: dto.title as string | undefined,
          content: dto.content as string | undefined,
          customerId: dto.customerId as string | undefined,
          phone: dto.phone as string | undefined,
          categoryId: dto.categoryId as string | undefined,
          procedureId: dto.procedureId as string | undefined,
          iamEmployeeId: dto.iamEmployeeId as string | undefined,
          iamExecutorId: dto.iamExecutorId as string | undefined,
          iamDepartmentId: dto.iamDepartmentId as string | undefined,
          priority: dto.priority as number | undefined,
          startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
          note: dto.note as string | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }

    return this.prisma.ticket.create({
      data: {
        tenantId: actor.tenantId,
        code: `T-${Date.now()}`,
        title: dto.title as string,
        content: dto.content as string | undefined,
        customerId: dto.customerId as string | undefined,
        phone: dto.phone as string | undefined,
        categoryId: dto.categoryId as string | undefined,
        procedureId: dto.procedureId as string | undefined,
        iamEmployeeId: (dto.iamEmployeeId as string) ?? actor.id,
        iamCreatorId: actor.id,
        iamDepartmentId: dto.iamDepartmentId as string | undefined,
        status: 0,
        priority: (dto.priority as number) ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async collect(ticketId: string, dto: Record<string, unknown>, actor: RequestUser) {
    // updateAndInit: create ticket + initialize support objects for procedure
    const ticket = await this.upsert({ ...dto, id: ticketId }, actor);
    if (ticket.procedureId) {
      await this.initializeSupportObjects(ticket.id, ticket.procedureId, actor);
    }
    return ticket;
  }

  private async initializeSupportObjects(ticketId: string, procedureId: string, actor: RequestUser) {
    const steps = await this.prisma.ticketProcedureStep.findMany({
      where: { procedureId, deletedAt: null },
    }) as Array<{ id: string }>;
    await this.prisma.supportObject.createMany({
      data: steps.map((step) => ({
        tenantId: actor.tenantId,
        ticketId,
        stepId: step.id,
        status: 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      })),
      skipDuplicates: true,
    });
  }

  async updateStatus(id: string, status: number, actor: RequestUser) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status, updatedBy: actor.id },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.ticket.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Ticket deleted' };
  }

  // Exchanges
  async listExchanges(ticketId: string, page = 1, limit = 20) {
    return this.prisma.ticketExchange.findMany({
      where: { ticketId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async addExchange(dto: { ticketId: string; content?: string; contentDelta?: string; mediaUrls?: object }, actor: RequestUser) {
    return this.prisma.ticketExchange.create({
      data: {
        tenantId: actor.tenantId,
        ticketId: dto.ticketId,
        iamAuthorId: actor.id,
        content: dto.content,
        contentDelta: dto.contentDelta,
        mediaUrls: dto.mediaUrls,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.ticketExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  // Categories
  async listCategories(tenantId: string, type?: number) {
    return this.prisma.ticketCategory.findMany({
      where: { tenantId, deletedAt: null, ...(type !== undefined ? { type } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertCategory(dto: { id?: string; name: string; type?: number; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.ticketCategory.update({
        where: { id: dto.id },
        data: { name: dto.name, type: dto.type, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.ticketCategory.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        type: dto.type ?? 0,
        position: dto.position ?? 0,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteCategory(id: string, actor: RequestUser) {
    await this.prisma.ticketCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Category deleted' };
  }

  // QR Codes
  async listQrCodes(tenantId: string) {
    return this.prisma.qrCode.findMany({ where: { tenantId, deletedAt: null } });
  }

  async upsertQrCode(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.qrCode.update({
        where: { id },
        data: { ...(dto as Record<string, unknown>), id: undefined, updatedBy: actor.id },
      });
    }
    return this.prisma.qrCode.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: (dto.code as string) ?? `QR-${Date.now()}`,
        link: dto.link as string,
        startDate: dto.startDate ? new Date(dto.startDate as string) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate as string) : undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteQrCode(id: string, actor: RequestUser) {
    await this.prisma.qrCode.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'QR code deleted' };
  }
}
