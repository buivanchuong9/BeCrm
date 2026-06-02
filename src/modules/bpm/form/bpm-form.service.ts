import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmFormService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── BpmForm ────────────────────────────────────────────────────────────────

  async listForms(tenantId: string, query?: { keyword?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (query?.keyword) where.name = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.bpmForm.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.bpmForm.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async listEforms(tenantId: string, query?: { keyword?: string; page?: number; limit?: number }) {
    return this.listForms(tenantId, query);
  }

  async upsertForm(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmForm.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } as any },
      });
    }
    return this.prisma.bpmForm.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        description: dto.description as string | undefined,
        schema: dto.schema as object | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteForm(id: string, actor: RequestUser) {
    await this.prisma.bpmForm.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BpmForm deleted' };
  }

  async getFormById(id: string) {
    const form = await this.prisma.bpmForm.findUnique({
      where: { id },
      include: {
        artifacts: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!form) throw new NotFoundException('BpmForm', id);
    return form;
  }

  // ── BpmFormArtifact ────────────────────────────────────────────────────────

  async listArtifacts(tenantId: string, query?: { bpmFormId?: string; keyword?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.bpmFormId) where.bpmFormId = query.bpmFormId;
    if (query?.keyword) where.fieldLabel = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.bpmFormArtifact.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { position: 'asc' } }),
      this.prisma.bpmFormArtifact.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getArtifact(id: string) {
    const a = await this.prisma.bpmFormArtifact.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('BpmFormArtifact', id);
    return a;
  }

  async upsertArtifact(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmFormArtifact.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.bpmFormArtifact.create({
      data: {
        tenantId: actor.tenantId,
        bpmFormId: dto.bpmFormId as string,
        fieldKey: dto.fieldKey as string,
        fieldLabel: dto.fieldLabel as string,
        fieldType: (dto.fieldType as string) ?? 'text',
        position: (dto.position as number) ?? 0,
        config: dto.config as object | undefined,
        eformConfig: dto.eformConfig as object | undefined,
        isRequired: (dto.isRequired as boolean) ?? false,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteArtifact(id: string, actor: RequestUser) {
    await this.prisma.bpmFormArtifact.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BpmFormArtifact deleted' };
  }

  async updateArtifactPosition(dto: { id: string; position: number }, actor: RequestUser) {
    return this.prisma.bpmFormArtifact.update({
      where: { id: dto.id },
      data: { position: dto.position, updatedBy: actor.id },
    });
  }

  async updateArtifactConfig(dto: { id: string; config: object }, actor: RequestUser) {
    return this.prisma.bpmFormArtifact.update({
      where: { id: dto.id },
      data: { config: dto.config, updatedBy: actor.id },
    });
  }

  async updateArtifactEform(dto: { id: string; eformConfig: object }, actor: RequestUser) {
    return this.prisma.bpmFormArtifact.update({
      where: { id: dto.id },
      data: { eformConfig: dto.eformConfig, updatedBy: actor.id },
    });
  }

  // ── BpmFormMapping ─────────────────────────────────────────────────────────

  async listFormMappings(tenantId: string, query?: { bpmFormId?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.bpmFormId) where.bpmFormId = query.bpmFormId;

    const [data, total] = await Promise.all([
      this.prisma.bpmFormMapping.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.bpmFormMapping.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async listFormMappingsSource(tenantId: string, query?: Record<string, unknown>) {
    return this.listFormMappings(tenantId, query as Record<string, never>);
  }

  async listFormMappingsTarget(bpmFormId: string, tenantId: string, query?: Record<string, unknown>) {
    const page = 1;
    const limit = 50;
    const [data, total] = await Promise.all([
      this.prisma.bpmFormMapping.findMany({ where: { bpmFormId, tenantId, deletedAt: null }, skip: 0, take: limit }),
      this.prisma.bpmFormMapping.count({ where: { bpmFormId, tenantId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async getFormMapping(id: string) {
    const m = await this.prisma.bpmFormMapping.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('BpmFormMapping', id);
    return m;
  }

  async upsertFormMapping(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmFormMapping.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.bpmFormMapping.create({
      data: {
        tenantId: actor.tenantId,
        bpmFormId: dto.bpmFormId as string,
        sourceField: dto.sourceField as string,
        targetField: dto.targetField as string,
        targetModel: dto.targetModel as string | undefined,
        mapType: (dto.mapType as string) ?? 'direct',
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteFormMapping(id: string, actor: RequestUser) {
    await this.prisma.bpmFormMapping.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BpmFormMapping deleted' };
  }

  // ── BpmFormProcess ─────────────────────────────────────────────────────────

  async listFormProcesses(tenantId: string, query?: { bpmFormId?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.bpmFormId) where.bpmFormId = query.bpmFormId;

    const [data, total] = await Promise.all([
      this.prisma.bpmFormProcess.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.bpmFormProcess.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getFormProcess(id: string) {
    const p = await this.prisma.bpmFormProcess.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('BpmFormProcess', id);
    return p;
  }

  async upsertFormProcess(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmFormProcess.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.bpmFormProcess.create({
      data: {
        tenantId: actor.tenantId,
        bpmFormId: dto.bpmFormId as string,
        templateId: dto.templateId as string | undefined,
        nodeKey: dto.nodeKey as string | undefined,
        triggerEvent: dto.triggerEvent as string | undefined,
        config: dto.config as object | undefined,
        isActive: (dto.isActive as boolean) ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteFormProcess(id: string, actor: RequestUser) {
    await this.prisma.bpmFormProcess.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BpmFormProcess deleted' };
  }

  async cloneFormMapping(id: string, actor: RequestUser) {
    const src = await this.prisma.bpmFormMapping.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('BpmFormMapping', id);
    return this.prisma.bpmFormMapping.create({
      data: {
        tenantId: src.tenantId,
        bpmFormId: src.bpmFormId,
        sourceField: src.sourceField,
        targetField: src.targetField,
        targetModel: src.targetModel ?? undefined,
        mapType: src.mapType,
        config: src.config ?? undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }
}
