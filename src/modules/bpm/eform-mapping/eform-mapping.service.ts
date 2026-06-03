import { Injectable } from '@nestjs/common';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class EformMappingService {
  constructor(private prisma: PrismaService) {}

  async listSource(tenantId: string, query?: { keyword?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.keyword) where.eformName = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.eformMapping.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.eformMapping.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getById(id: string) {
    const e = await this.prisma.eformMapping.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('EformMapping', id);
    return e;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.eformMapping.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.eformMapping.create({
      data: {
        tenantId: actor.tenantId,
        eformCode: dto.eformCode as string,
        eformName: dto.eformName as string,
        sourceField: dto.sourceField as string,
        targetField: dto.targetField as string,
        targetModel: dto.targetModel as string | undefined,
        config: dto.config as object | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.eformMapping.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'EformMapping deleted' };
  }
}
