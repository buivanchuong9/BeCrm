import { Injectable } from '@nestjs/common';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, OptimisticLockException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { CreateProcessTemplateDto, UpdateProcessTemplateDto } from './bpm-process.dto';

export interface GraphDto {
  nodes: Array<{
    nodeKey: string;
    nodeType: 'Start' | 'End' | 'UserTask' | 'ApprovalTask' | 'ExclusiveGateway';
    name: string;
    positionX: number;
    positionY: number;
    config?: object;
  }>;
  edges: Array<{
    edgeKey: string;
    fromNodeKey: string;
    toNodeKey: string;
    label?: string;
    condition?: object;
  }>;
}

@Injectable()
export class BpmTemplateService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query?: { name?: string; status?: string; category?: string; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query?.status) where.status = query.status;
    if (query?.category) where.category = query.category;

    const [data, total] = await Promise.all([
      this.prisma.bpmProcessTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { nodes: true, instances: true } } },
      }),
      this.prisma.bpmProcessTemplate.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getById(id: string, tenantId: string) {
    const template = await this.prisma.bpmProcessTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        nodes: { where: { deletedAt: null } },
        edges: true,
      },
    });
    if (!template) throw new NotFoundException('BpmProcessTemplate', id);

    // FE reads result.configs (not result.edges) — RESPONSE_CONTRACT_GAPS GAP-03
    // FE also reads: result.nodes[i].{id, typeNode, position, code, name, configData, point}
    const nodes = (template.nodes as Array<Record<string, unknown>>).map((n) => ({
      id: n['nodeKey'] ?? n['id'],
      processId: id,
      typeNode: n['nodeType'] ?? 'default',
      name: n['name'] ?? '',
      code: (n['nodeType'] as string ?? '').toLowerCase().replace('task', '').replace('event', '') || 'do',
      position: { x: Number(n['positionX'] ?? 0), y: Number(n['positionY'] ?? 0) },
      point: null,
      configData: n['config'] ?? null,
    }));

    const configs = (template.edges as Array<Record<string, unknown>>).map((e) => ({
      id: e['id'],
      fromNodeId: e['fromNodeKey'] ?? e['fromNodeId'],
      toNodeId: e['toNodeKey'] ?? e['toNodeId'],
      condition: e['condition'] ? 1 : 0,
    }));

    return { ...template, nodes, configs };
  }

  async create(dto: CreateProcessTemplateDto, actor: RequestUser) {
    return this.prisma.bpmProcessTemplate.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        xmlData: dto.xmlData,
        xmlVersion: dto.xmlData ? 1 : 0,
        status: dto.status ?? 'draft',
        version: 1,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async update(id: string, dto: UpdateProcessTemplateDto, actor: RequestUser) {
    const existing = await this.prisma.bpmProcessTemplate.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) throw new NotFoundException('BpmProcessTemplate', id);
    if (existing.status === 'published') {
      // Cannot edit published template — create new version
      return this.prisma.bpmProcessTemplate.create({
        data: {
          tenantId: actor.tenantId,
          name: dto.name ?? existing.name,
          xmlData: dto.xmlData ?? existing.xmlData,
          xmlVersion: dto.xmlData ? existing.xmlVersion + 1 : existing.xmlVersion,
          status: 'draft',
          version: existing.version + 1,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { 
        ...dto, 
        xmlData: dto.xmlData ?? existing.xmlData,
        xmlVersion: dto.xmlData && dto.xmlData !== existing.xmlData ? existing.xmlVersion + 1 : existing.xmlVersion,
        rowVersion: { increment: 1 }, 
        updatedBy: actor.id 
      },
    });
  }

  async saveGraph(templateId: string, graph: GraphDto, actor: RequestUser) {
    const template = await this.prisma.bpmProcessTemplate.findFirst({
      where: { id: templateId, tenantId: actor.tenantId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('BpmProcessTemplate', templateId);

    // Replace all nodes and edges
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bpmEdge.deleteMany({ where: { templateId } });
      await tx.bpmNode.deleteMany({ where: { templateId } });

      const nodeMap = new Map<string, string>();

      for (const node of graph.nodes) {
        const created = await tx.bpmNode.create({
          data: {
            tenantId: actor.tenantId,
            templateId,
            nodeKey: node.nodeKey,
            nodeType: node.nodeType,
            name: node.name,
            positionX: node.positionX,
            positionY: node.positionY,
            config: node.config,
            createdBy: actor.id,
          },
        });
        nodeMap.set(node.nodeKey, created.id);
      }

      for (const edge of graph.edges) {
        const fromNodeId = nodeMap.get(edge.fromNodeKey);
        const toNodeId = nodeMap.get(edge.toNodeKey);
        if (!fromNodeId || !toNodeId) continue;
        await tx.bpmEdge.create({
          data: {
            tenantId: actor.tenantId,
            templateId,
            edgeKey: edge.edgeKey,
            fromNodeId,
            toNodeId,
            label: edge.label,
            condition: edge.condition,
            createdBy: actor.id,
          },
        });
      }

      await tx.bpmProcessTemplate.update({
        where: { id: templateId },
        data: { updatedBy: actor.id },
      });
    });

    return this.getById(templateId, actor.tenantId);
  }

  async publish(id: string, actor: RequestUser) {
    const template = await this.prisma.bpmProcessTemplate.findFirst({
      where: { id, tenantId: actor.tenantId, deletedAt: null },
      include: { nodes: { where: { deletedAt: null } } },
    });
    if (!template) throw new NotFoundException('BpmProcessTemplate', id);

    const nodes = template.nodes as Array<{ nodeType: string }>;
    const hasStart = nodes.some((n) => n.nodeType === 'Start');
    const hasEnd = nodes.some((n) => n.nodeType === 'End');
    if (!hasStart || !hasEnd) {
      throw new Error('Process template must have at least one Start and one End node before publishing');
    }

    return this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { status: 'published', rowVersion: { increment: 1 }, updatedBy: actor.id },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Process template deleted' };
  }
}
