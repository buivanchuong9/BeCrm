import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class DecisionTableService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.decisionTable.findMany({ where: { tenantId, deletedAt: null }, skip: (page - 1) * limit, take: limit, include: { inputs: { where: { deletedAt: null } }, outputs: { where: { deletedAt: null } } } }),
      this.prisma.decisionTable.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) { return this.prisma.decisionTable.findUnique({ where: { id }, include: { inputs: { where: { deletedAt: null } }, outputs: { where: { deletedAt: null } } } }); }

  async upsert(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.decisionTable.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.decisionTable.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, config: dto.config as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.decisionTable.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async updateActive(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.decisionTable.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }

  async upsertInput(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.decisionTableInput.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.decisionTableInput.create({ data: { tenantId: actor.tenantId, decisionTableId: dto.decisionTableId as string, name: dto.name as string, fieldKey: dto.fieldKey as string, operator: (dto.operator as string) ?? 'eq', value: dto.value as string | undefined, dataType: (dto.dataType as string) ?? 'string', position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteInput(id: string, actor: RequestUser) {
    await this.prisma.decisionTableInput.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async updateInputActive(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.decisionTableInput.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }

  async upsertOutput(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.decisionTableOutput.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.decisionTableOutput.create({ data: { tenantId: actor.tenantId, decisionTableId: dto.decisionTableId as string, name: dto.name as string, fieldKey: dto.fieldKey as string, value: dto.value as string | undefined, dataType: (dto.dataType as string) ?? 'string', position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteOutput(id: string, actor: RequestUser) {
    await this.prisma.decisionTableOutput.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async updateOutputActive(id: string, isActive: boolean, actor: RequestUser) {
    return this.prisma.decisionTableOutput.update({ where: { id }, data: { isActive, updatedBy: actor.id } });
  }
}
