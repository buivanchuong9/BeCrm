import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmParticipantService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    templateId?: string; nodeKey?: string; keyword?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.templateId) where.templateId = query.templateId;
    if (query?.nodeKey) where.nodeKey = query.nodeKey;

    const [data, total] = await Promise.all([
      this.prisma.bpmParticipant.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.bpmParticipant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const p = await this.prisma.bpmParticipant.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('BpmParticipant', id);
    return p;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmParticipant.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.bpmParticipant.create({
      data: {
        tenantId: actor.tenantId,
        templateId: dto.templateId as string | undefined,
        nodeKey: dto.nodeKey as string | undefined,
        participantType: (dto.participantType as string) ?? 'user',
        iamUserId: dto.iamUserId as string | undefined,
        iamRoleId: dto.iamRoleId as string | undefined,
        iamDeptId: dto.iamDeptId as string | undefined,
        isBlacklisted: (dto.isBlacklisted as boolean) ?? false,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.bpmParticipant.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BpmParticipant deleted' };
  }

  async getUsersAndGroups(tenantId: string) {
    const [users, roles] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: { id: true, username: true, name: true, email: true },
      }),
      this.prisma.role.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, code: true },
      }),
    ]);
    return { users, roles };
  }
}
