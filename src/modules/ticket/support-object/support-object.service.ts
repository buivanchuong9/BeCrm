import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class SupportObjectService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { ticketId?: string; status?: number; iamAssigneeId?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.ticketId) where.ticketId = query.ticketId;
    if (query?.status !== undefined) where.status = query.status;
    if (query?.iamAssigneeId) where.iamAssigneeId = query.iamAssigneeId;

    const [data, total] = await Promise.all([
      this.prisma.supportObject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: { select: { id: true, title: true, code: true } },
          step: { select: { id: true, name: true, stepType: true } },
          logs: { orderBy: { occurredAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.supportObject.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async receive(id: string, note: string | undefined, actor: RequestUser) {
    await this.prisma.supportObject.update({
      where: { id },
      data: { status: 1, iamAssigneeId: actor.id, updatedBy: actor.id },
    });
    await this.prisma.supportLog.create({
      data: {
        tenantId: actor.tenantId,
        supportObjectId: id,
        iamActorId: actor.id,
        action: 1,
        status: 1,
        note,
        createdBy: actor.id,
      },
    });
    return { message: 'Support object received' };
  }

  async processDone(id: string, note: string | undefined, actor: RequestUser) {
    await this.prisma.supportObject.update({
      where: { id },
      data: { status: 2, updatedBy: actor.id },
    });
    await this.prisma.supportLog.create({
      data: {
        tenantId: actor.tenantId,
        supportObjectId: id,
        iamActorId: actor.id,
        action: 2,
        status: 2,
        note,
        createdBy: actor.id,
      },
    });
    return { message: 'Support object completed' };
  }

  async processRejected(id: string, note: string | undefined, actor: RequestUser) {
    await this.prisma.supportObject.update({
      where: { id },
      data: { status: 3, updatedBy: actor.id },
    });
    await this.prisma.supportLog.create({
      data: {
        tenantId: actor.tenantId,
        supportObjectId: id,
        iamActorId: actor.id,
        action: 3,
        status: 3,
        note,
        createdBy: actor.id,
      },
    });
    return { message: 'Support object rejected' };
  }

  async resetTransferVotes(id: string, actor: RequestUser) {
    await this.prisma.supportObject.update({
      where: { id },
      data: { status: 0, updatedBy: actor.id },
    });
    return { message: 'Support object reset to pending' };
  }

  async listLogs(supportObjectId: string) {
    return this.prisma.supportLog.findMany({
      where: { supportObjectId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async addLog(dto: { supportObjectId: string; action: number; status: number; note?: string }, actor: RequestUser) {
    return this.prisma.supportLog.create({
      data: {
        tenantId: actor.tenantId,
        supportObjectId: dto.supportObjectId,
        iamActorId: actor.id,
        action: dto.action,
        status: dto.status,
        note: dto.note,
        createdBy: actor.id,
      },
    });
  }
}
