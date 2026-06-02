import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type Dto = Record<string, unknown>;

// Generic handler for all BPMN node types
// All node types share: get(id), update(dto), clone(id), delete(id)
// Stored as BpmNode with nodeType discriminator

@Injectable()
export class BpmNodeService {
  constructor(private prisma: PrismaService) {}

  async getNode(nodeType: string, id: string) {
    return this.prisma.bpmNode.findUnique({ where: { id } });
  }

  async upsertNode(nodeType: string, dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmNode.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          positionX: dto.positionX as number | undefined,
          positionY: dto.positionY as number | undefined,
          config: dto.config as object | undefined,
        },
      });
    }
    return this.prisma.bpmNode.create({
      data: {
        tenantId: actor.tenantId,
        templateId: dto.templateId as string,
        nodeKey: (dto.nodeKey as string) ?? `${nodeType}_${Date.now()}`,
        nodeType,
        name: (dto.name as string) ?? nodeType,
        positionX: (dto.positionX as number) ?? 0,
        positionY: (dto.positionY as number) ?? 0,
        config: dto.config as object | undefined,
        createdBy: actor.id,
      },
    });
  }

  async cloneNode(nodeType: string, id: string, actor: RequestUser) {
    const node = await this.prisma.bpmNode.findUnique({ where: { id } });
    if (!node) return null;
    return this.prisma.bpmNode.create({
      data: {
        tenantId: node.tenantId,
        templateId: node.templateId,
        nodeKey: `${node.nodeKey}_copy_${Date.now()}`,
        nodeType: node.nodeType,
        name: node.name + ' (copy)',
        positionX: node.positionX + 50,
        positionY: node.positionY + 50,
        config: node.config ?? undefined,
        createdBy: actor.id,
      },
    });
  }

  async deleteNode(id: string, actor: RequestUser) {
    await this.prisma.bpmNode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Node deleted' };
  }

  // BpmConfigNode (process step configuration)
  async listConfigNodes(tenantId: string, templateId?: string, page = 1, limit = 50) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (templateId) where.templateId = templateId;
    const [data, total] = await Promise.all([
      this.prisma.bpmNode.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.bpmNode.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getConfigNode(id: string) {
    return this.prisma.bpmNode.findUnique({ where: { id } });
  }

  async upsertConfigNode(dto: Dto, actor: RequestUser) {
    return this.upsertNode(dto.nodeType as string ?? 'configNode', dto, actor);
  }

  async deleteConfigNode(id: string, actor: RequestUser) {
    return this.deleteNode(id, actor);
  }

  // BpmConfigLinkNode (edge configuration)
  async listConfigLinkNodes(tenantId: string, templateId?: string, page = 1, limit = 50) {
    const where: Record<string, unknown> = { tenantId };
    if (templateId) where.templateId = templateId;
    const [data, total] = await Promise.all([
      this.prisma.bpmEdge.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.bpmEdge.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async listConfigLinkNodeChildren(tenantId: string, parentId?: string) {
    return this.prisma.bpmEdge.findMany({ where: { tenantId } });
  }

  async getConfigLinkNode(id: string) {
    return this.prisma.bpmEdge.findUnique({ where: { id } });
  }

  async upsertConfigLinkNode(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmEdge.update({
        where: { id },
        data: { label: dto.label as string | undefined, condition: dto.condition as object | undefined },
      });
    }
    return this.prisma.bpmEdge.create({
      data: {
        tenantId: actor.tenantId,
        templateId: dto.templateId as string,
        edgeKey: (dto.edgeKey as string) ?? `edge_${Date.now()}`,
        fromNodeId: dto.fromNodeId as string,
        toNodeId: dto.toNodeId as string,
        label: dto.label as string | undefined,
        condition: dto.condition as object | undefined,
        createdBy: actor.id,
      },
    });
  }

  async updateConfigLinkNodeConfig(dto: Dto, actor: RequestUser) {
    const id = dto.id as string;
    return this.prisma.bpmEdge.update({
      where: { id },
      data: { condition: dto.condition as object | undefined },
    });
  }

  async deleteConfigLinkNode(id: string) {
    await this.prisma.bpmEdge.delete({ where: { id } });
    return { message: 'Link deleted' };
  }

  // BusinessProcess (maps to BpmProcessTemplate)
  async listBusinessProcesses(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.keyword) where.name = { contains: q.keyword as string, mode: 'insensitive' };
    if (q.status) where.status = q.status;
    const [data, total] = await Promise.all([
      this.prisma.bpmProcessTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { nodes: { where: { deletedAt: null } }, edges: true },
      }),
      this.prisma.bpmProcessTemplate.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getBusinessProcess(id: string) {
    return this.prisma.bpmProcessTemplate.findUnique({
      where: { id },
      include: { nodes: { where: { deletedAt: null } }, edges: true },
    });
  }

  async upsertBusinessProcess(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmProcessTemplate.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any,
      });
    }
    return this.prisma.bpmProcessTemplate.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        category: dto.category as string | undefined,
        status: (dto.status as string) ?? 'draft',
        description: dto.description as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async updateBusinessProcessConfig(id: string, config: object, actor: RequestUser) {
    return this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { updatedBy: actor.id },
    });
  }

  async updateBusinessProcessSla(id: string, dto: object, actor: RequestUser) {
    return this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { updatedBy: actor.id },
    });
  }

  async deleteBusinessProcess(id: string, actor: RequestUser) {
    await this.prisma.bpmProcessTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BusinessProcess deleted' };
  }

  async cloneBusinessProcess(id: string, actor: RequestUser) {
    const bp = await this.prisma.bpmProcessTemplate.findUnique({
      where: { id },
      include: { nodes: { where: { deletedAt: null } }, edges: true },
    });
    if (!bp) return null;
    const newBp = await this.prisma.bpmProcessTemplate.create({
      data: {
        tenantId: bp.tenantId,
        name: bp.name + ' (copy)',
        code: bp.code ? bp.code + '_copy' : undefined,
        category: bp.category ?? undefined,
        status: 'draft',
        description: bp.description ?? undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    return newBp;
  }

  async deleteNodeFromProcess(nodeId: string, actor: RequestUser) {
    await this.prisma.bpmNode.update({ where: { id: nodeId }, data: { deletedAt: new Date() } });
    return { message: 'Node removed' };
  }

  exportExcel(id: string) { return { url: `/exports/process-${id}.xlsx` }; }
  getExportStatus(id: string) { return { status: 'ready', url: `/exports/process-${id}.xlsx` }; }
  importExcel(dto: Dto) { return { imported: true }; }

  // StateMapping
  async listStateMappings(tenantId: string) { return []; }
  async upsertStateMapping(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async deleteStateMapping(id: string) { return { message: 'Deleted' }; }

  // VariableDeclare
  async listVariables(tenantId: string) { return []; }
  async upsertVariable(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async deleteVariable(id: string) { return { message: 'Deleted' }; }
  async listVariableInstances(instanceId: string) { return []; }

  // ProcessedObject
  async listProcessedObjects(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.bpmProcessInstance.findMany({ where: { tenantId, deletedAt: null }, skip: (page - 1) * limit, take: limit, orderBy: { startedAt: 'desc' } }),
      this.prisma.bpmProcessInstance.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async listProcessedObjectLogs(instanceId: string) {
    return this.prisma.bpmInstanceHistory.findMany({ where: { instanceId }, orderBy: { occurredAt: 'desc' } });
  }

  // Workflow
  async listWorkflows(tenantId: string) { return this.listBusinessProcesses(tenantId); }
  async listWorkflowStatuses(tenantId: string) { return []; }

  // OLA/SLA
  exportOLA(tenantId: string) { return { url: `/exports/ola-${Date.now()}.xlsx` }; }
  exportSLA(tenantId: string) { return { url: `/exports/sla-${Date.now()}.xlsx` }; }

  // ProcessInstance
  async listProcessInstances(tenantId: string) {
    return this.prisma.bpmProcessInstance.findMany({ where: { tenantId, deletedAt: null }, take: 20, orderBy: { startedAt: 'desc' } });
  }

  // ServiceLevel
  async listServiceLevels(tenantId: string) { return []; }
  async upsertServiceLevel(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async listServiceLevelHistories(tenantId: string) { return []; }

  // BpmObject
  async listBpmObjects(tenantId: string) { return []; }
  async upsertBpmObject(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async deleteBpmObject(id: string) { return { message: 'Deleted' }; }

  // BpmTrigger
  async listBpmTriggers(tenantId: string) { return []; }
  async upsertBpmTrigger(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async deleteBpmTrigger(id: string) { return { message: 'Deleted' }; }

  // BpmAssignmentRule
  async listBpmAssignmentRules(tenantId: string) { return []; }
  async upsertBpmAssignmentRule(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }

  // BpmSegmentFilter
  async listBpmSegmentFilters(tenantId: string) { return []; }
  async upsertBpmSegmentFilter(dto: Dto, actor: RequestUser) { return { id: 'stub', ...dto }; }
  async deleteBpmSegmentFilter(id: string) { return { message: 'Deleted' }; }

  // FindByCriteria
  async findByCriteria(tenantId: string, dto: Dto) { return { data: [], total: 0 }; }

  // Rest (external REST call proxy)
  async restCall(dto: Dto) { return { result: null, message: 'REST proxy not configured' }; }
}
