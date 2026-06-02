import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class WarrantyProcedureService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; status?: number; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.status !== undefined) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.warrantyProcedure.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warrantyProcedure.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string, tenantId: string) {
    const proc = await this.prisma.warrantyProcedure.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        steps: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        links: true,
      },
    });
    if (!proc) throw new NotFoundException('WarrantyProcedure', id);
    return proc;
  }

  async upsert(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.warrantyProcedure.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          code: dto.code as string | undefined,
          status: dto.status as number | undefined,
          description: dto.description as string | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.warrantyProcedure.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        status: (dto.status as number) ?? 0,
        description: dto.description as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.warrantyProcedure.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Warranty procedure deleted' };
  }

  async listSteps(procedureId: string, tenantId: string) {
    return this.prisma.warrantyProcedureStep.findMany({
      where: { procedureId, tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertStep(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.warrantyProcedureStep.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          stepType: dto.stepType as string | undefined,
          iamDepartmentId: dto.iamDepartmentId as string | undefined,
          period: dto.period as number | undefined,
          periodUnit: dto.periodUnit as string | undefined,
          position: dto.position as number | undefined,
          config: dto.config as object | undefined,
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.warrantyProcedureStep.create({
      data: {
        tenantId: actor.tenantId,
        procedureId: dto.procedureId as string,
        name: dto.name as string,
        stepType: (dto.stepType as string) ?? 'task',
        iamDepartmentId: dto.iamDepartmentId as string | undefined,
        period: dto.period as number | undefined,
        periodUnit: dto.periodUnit as string | undefined,
        position: (dto.position as number) ?? 0,
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteStep(id: string, actor: RequestUser) {
    await this.prisma.warrantyProcedureStep.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Step deleted' };
  }
}
