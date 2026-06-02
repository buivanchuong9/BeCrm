import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class ApprovedObjectService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: {
    objectType?: string; objectId?: string;
    page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId };
    if (query?.objectType) where.objectType = query.objectType;
    if (query?.objectId) where.objectId = query.objectId;

    const [data, total] = await Promise.all([
      this.prisma.approvedObjectLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvedObjectLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: Record<string, unknown>, actor: RequestUser) {
    return this.prisma.approvedObjectLog.create({
      data: {
        tenantId: actor.tenantId,
        objectType: dto.objectType as string,
        objectId: dto.objectId as string,
        action: dto.action as string,
        fromStatus: dto.fromStatus as string | undefined,
        toStatus: dto.toStatus as string | undefined,
        iamActorId: actor.id,
        note: dto.note as string | undefined,
        data: dto.data as object | undefined,
      },
    });
  }
}
