import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPagedResult } from '../../../shared/kernel/pagination';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type Dto = Record<string, unknown>;

// Generic handler for all BPMN node types
// All node types share: get(id), update(dto), clone(id), delete(id)
// Stored as BpmNode with nodeType discriminator

@Injectable()
export class BpmNodeService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private tenantWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  private templateIdFrom(dto: Dto): string | undefined {
    return (dto.templateId ?? dto.processId) as string | undefined;
  }

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
    return buildPagedResult(data, total, page, limit);
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
    return buildPagedResult(data, total, page, limit);
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
    return buildPagedResult(data, total, page, limit);
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
  async listStateMappings(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    if (q.stateCode) where.stateCode = q.stateCode;
    if (q.keyword) {
      where.OR = [
        { stateName: { contains: q.keyword as string, mode: 'insensitive' } },
        { stateCode: { contains: q.keyword as string, mode: 'insensitive' } },
      ];
    }
    return this.prisma.bpmStateMapping.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { stateCode: 'asc' }],
    });
  }

  async upsertStateMapping(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      stateCode: dto.stateCode as string,
      stateName: dto.stateName as string,
      color: dto.color as string | undefined,
      sortOrder: dto.sortOrder as number | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmStateMapping.update({ where: { id }, data });
    }
    return this.prisma.bpmStateMapping.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteStateMapping(id: string, actor?: RequestUser) {
    await this.prisma.bpmStateMapping.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // VariableDeclare
  async listVariables(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmVariableDeclare.findMany({ where, orderBy: { code: 'asc' } });
  }

  async getVariable(id: string) {
    const row = await this.prisma.bpmVariableDeclare.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('BpmVariableDeclare', id);
    return row;
  }

  async upsertVariable(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const templateId = this.templateIdFrom(dto);
    if (!id && !templateId) throw new NotFoundException('BpmProcessTemplate');
    const data = {
      templateId: templateId!,
      name: dto.name as string,
      code: dto.code as string,
      dataType: (dto.dataType as string) ?? 'String',
      defaultValue: dto.defaultValue as string | undefined,
      description: dto.description as string | undefined,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmVariableDeclare.update({ where: { id }, data });
    }
    return this.prisma.bpmVariableDeclare.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteVariable(id: string, actor?: RequestUser) {
    await this.prisma.bpmVariableDeclare.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  async listVariableInstances(instanceId: string) {
    return this.prisma.bpmVariableInstance.findMany({
      where: { instanceId, deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  // ProcessedObject
  async listProcessedObjects(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.status !== undefined) where.status = q.status;
    const [rows, total] = await Promise.all([
      this.prisma.bpmProcessInstance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { template: true, processedObject: true },
      }),
      this.prisma.bpmProcessInstance.count({ where }),
    ]);
    const data = rows.map((row) => this.mapProcessedObject(row));
    return buildPagedResult(data, total, page, limit);
  }

  private mapProcessedObject(row: {
    id: string;
    businessKey: string | null;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    template: { id: string; name: string };
    processedObject: {
      name: string | null;
      code: string | null;
      potId: string | null;
      customerName: string | null;
      patientName: string | null;
      mainDiagnosis: string | null;
      priority: string | null;
      iamEmployeeId: string | null;
      employeeName: string | null;
      status: number;
      sheetId: number | null;
      startTime: Date | null;
      endTime: Date | null;
    } | null;
  }) {
    const po = row.processedObject;
    return {
      id: row.id,
      name: po?.name ?? row.businessKey ?? '',
      code: po?.code ?? row.businessKey ?? '',
      potId: po?.potId ?? row.businessKey ?? '',
      customerName: po?.customerName ?? '',
      patientName: po?.patientName ?? '',
      mainDiagnosis: po?.mainDiagnosis ?? '',
      priority: po?.priority ?? 'normal',
      employeeId: po?.iamEmployeeId,
      employeeName: po?.employeeName ?? '',
      status: po?.status ?? (row.status === 'running' ? 1 : 2),
      processId: row.template.id,
      processName: row.template.name,
      createdTime: row.startedAt.toISOString(),
      startTime: (po?.startTime ?? row.startedAt).toISOString(),
      endTime: (po?.endTime ?? row.completedAt)?.toISOString() ?? '',
      sheetId: po?.sheetId ?? 0,
    };
  }

  async getProcessedObject(id: string) {
    const row = await this.prisma.bpmProcessInstance.findFirst({
      where: { id, deletedAt: null },
      include: { template: true, processedObject: true },
    });
    if (!row) throw new NotFoundException('ProcessedObject', id);
    return this.mapProcessedObject(row);
  }

  async upsertProcessedObject(dto: Dto, actor: RequestUser) {
    const instanceId = (dto.id ?? dto.instanceId) as string;
    const instance = await this.prisma.bpmProcessInstance.findFirst({
      where: { id: instanceId, deletedAt: null },
    });
    if (!instance) throw new NotFoundException('ProcessedObject', instanceId);

    const poData = {
      name: dto.name as string | undefined,
      code: dto.code as string | undefined,
      potId: (dto.potId as string) ?? instance.businessKey ?? undefined,
      customerName: dto.customerName as string | undefined,
      patientName: dto.patientName as string | undefined,
      mainDiagnosis: dto.mainDiagnosis as string | undefined,
      priority: dto.priority as string | undefined,
      iamEmployeeId: (dto.employeeId ?? dto.iamEmployeeId) as string | undefined,
      employeeName: dto.employeeName as string | undefined,
      status: dto.status as number | undefined,
      sheetId: dto.sheetId as number | undefined,
      startTime: dto.startTime ? new Date(dto.startTime as string) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime as string) : undefined,
      metadata: dto.metadata as object | undefined,
    };

    await this.prisma.bpmProcessedObject.upsert({
      where: { instanceId },
      create: { tenantId: instance.tenantId, instanceId, ...poData },
      update: poData,
    });

    if (dto.businessKey || dto.potId) {
      await this.prisma.bpmProcessInstance.update({
        where: { id: instanceId },
        data: {
          businessKey: (dto.potId ?? dto.businessKey ?? dto.code) as string | undefined,
          status: dto.status !== undefined ? String(dto.status) : undefined,
          updatedBy: actor.id,
        },
      });
    }

    return this.getProcessedObject(instanceId);
  }

  async deleteProcessedObject(id: string, actor?: RequestUser) {
    await this.prisma.$transaction([
      this.prisma.bpmProcessedObject.updateMany({
        where: { instanceId: id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.bpmProcessInstance.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actor?.id ?? undefined },
      }),
    ]);
    return { message: 'Deleted' };
  }

  async resetProcessedObject(id: string, actor?: RequestUser) {
    await this.prisma.$transaction([
      this.prisma.bpmProcessInstance.update({
        where: { id },
        data: {
          status: 'running',
          completedAt: null,
          variables: {},
          updatedBy: actor?.id ?? undefined,
        },
      }),
      this.prisma.bpmProcessedObject.updateMany({
        where: { instanceId: id },
        data: { status: 0, endTime: null },
      }),
      this.prisma.bpmVariableInstance.updateMany({
        where: { instanceId: id },
        data: { deletedAt: new Date() },
      }),
    ]);
    return { reset: true, id };
  }

  async listProcessedObjectLogs(instanceId: string) {
    return this.prisma.bpmInstanceHistory.findMany({ where: { instanceId }, orderBy: { occurredAt: 'desc' } });
  }

  // Workflow
  async listWorkflows(tenantId: string) { return this.listBusinessProcesses(tenantId); }

  async listWorkflowStatuses(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmWorkflowStatus.findMany({
      where,
      orderBy: [{ stepNumber: 'asc' }],
    });
  }

  async upsertWorkflowStatus(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const templateId = this.templateIdFrom(dto);
    if (!id && !templateId) throw new NotFoundException('BpmProcessTemplate');
    const data = {
      templateId: templateId!,
      stepName: dto.stepName as string,
      stepNumber: Number(dto.stepNumber ?? 0),
      stateCode: dto.stateCode as string,
      stateName: dto.stateName as string,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmWorkflowStatus.update({ where: { id }, data });
    }
    return this.prisma.bpmWorkflowStatus.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteWorkflowStatus(id: string, actor?: RequestUser) {
    await this.prisma.bpmWorkflowStatus.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // OLA/SLA
  async exportOLA(tenantId: string) {
    const data = await this.listServiceLevels(tenantId, 'OLA');
    return { url: `/exports/ola-${Date.now()}.xlsx`, count: data.length };
  }

  async exportSLA(tenantId: string) {
    const data = await this.listServiceLevels(tenantId, 'SLA');
    return { url: `/exports/sla-${Date.now()}.xlsx`, count: data.length };
  }

  // ProcessInstance
  async listProcessInstances(tenantId: string) {
    return this.prisma.bpmProcessInstance.findMany({ where: { tenantId, deletedAt: null }, take: 20, orderBy: { startedAt: 'desc' } });
  }

  // ServiceLevel
  async listServiceLevels(tenantId: string, slaType?: string) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    if (slaType) where.slaType = slaType.toUpperCase();
    return this.prisma.bpmServiceLevel.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getServiceLevel(id: string) {
    const row = await this.prisma.bpmServiceLevel.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('BpmServiceLevel', id);
    return row;
  }

  async upsertServiceLevel(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      nodeKey: dto.nodeKey as string | undefined,
      name: dto.name as string | undefined,
      code: dto.code as string | undefined,
      slaType: ((dto.slaType ?? dto.type) as string | undefined)?.toUpperCase() ?? 'SLA',
      duration: Number(dto.duration ?? 0),
      durationUnit: (dto.durationUnit as string) ?? 'hours',
      status: dto.status !== undefined ? Number(dto.status) : undefined,
      escalationAction: dto.escalationAction as object | undefined,
      config: dto.config as object | undefined,
      isActive: dto.isActive as boolean | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmServiceLevel.update({ where: { id }, data });
    }
    return this.prisma.bpmServiceLevel.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteServiceLevel(id: string, actor?: RequestUser) {
    await this.prisma.bpmServiceLevel.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  async listServiceLevelHistories(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.instanceId) where.instanceId = q.instanceId;
    if (q.serviceLevelId) where.serviceLevelId = q.serviceLevelId;
    return this.prisma.bpmServiceLevelHistory.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  async upsertServiceLevelHistory(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      serviceLevelId: dto.serviceLevelId as string | undefined,
      instanceId: dto.instanceId as string | undefined,
      potId: dto.potId as string | undefined,
      nodeKey: dto.nodeKey as string | undefined,
      status: dto.status !== undefined ? Number(dto.status) : undefined,
      startedAt: dto.startedAt ? new Date(dto.startedAt as string) : undefined,
      dueAt: dto.dueAt ? new Date(dto.dueAt as string) : undefined,
      completedAt: dto.completedAt ? new Date(dto.completedAt as string) : undefined,
      breachedAt: dto.breachedAt ? new Date(dto.breachedAt as string) : undefined,
      metadata: dto.metadata as object | undefined,
    };
    if (id) {
      return this.prisma.bpmServiceLevelHistory.update({ where: { id }, data });
    }
    return this.prisma.bpmServiceLevelHistory.create({
      data: { ...data, tenantId: actor.tenantId, status: data.status ?? 0 },
    });
  }

  // ProcessPermission
  async upsertProcessPermission(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      name: dto.name as string,
      uri: dto.uri as string,
      processCode: dto.processCode as string | undefined,
      processName: dto.processName as string | undefined,
      templateId: this.templateIdFrom(dto),
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmProcessPermission.update({ where: { id }, data });
    }
    return this.prisma.bpmProcessPermission.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  // BpmObject
  async listBpmObjects(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmObject.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getBpmObject(id: string) {
    const row = await this.prisma.bpmObject.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('BpmObject', id);
    return row;
  }

  async upsertBpmObject(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      name: dto.name as string,
      code: dto.code as string | undefined,
      objectType: dto.objectType as string | undefined,
      status: dto.status !== undefined ? Number(dto.status) : undefined,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmObject.update({ where: { id }, data });
    }
    return this.prisma.bpmObject.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id, status: data.status ?? 1 },
    });
  }

  async deleteBpmObject(id: string, actor?: RequestUser) {
    await this.prisma.bpmObject.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // BpmTrigger
  async listBpmTriggers(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmTrigger.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async upsertBpmTrigger(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      name: dto.name as string,
      code: dto.code as string | undefined,
      triggerType: dto.triggerType as string | undefined,
      eventName: dto.eventName as string | undefined,
      status: dto.status !== undefined ? Number(dto.status) : undefined,
      activated: dto.activated as boolean | undefined,
      condition: dto.condition as object | undefined,
      action: dto.action as object | undefined,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmTrigger.update({ where: { id }, data });
    }
    return this.prisma.bpmTrigger.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id, name: data.name ?? 'Trigger' },
    });
  }

  async activateBpmTrigger(dto: Dto, actor: RequestUser) {
    const id = (dto.id ?? dto.triggerId) as string;
    return this.prisma.bpmTrigger.update({
      where: { id },
      data: { status: 2, activated: true, updatedBy: actor.id },
    });
  }

  async deleteBpmTrigger(id: string, actor?: RequestUser) {
    await this.prisma.bpmTrigger.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // BpmAssignmentRule
  async listBpmAssignmentRules(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmAssignmentRule.findMany({ where, orderBy: { priority: 'desc' } });
  }

  async upsertBpmAssignmentRule(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      nodeKey: dto.nodeKey as string | undefined,
      name: dto.name as string,
      ruleType: dto.ruleType as string | undefined,
      assigneeType: dto.assigneeType as string | undefined,
      assigneeRef: (dto.assigneeRef ?? dto.assigneeId) as string | undefined,
      priority: dto.priority !== undefined ? Number(dto.priority) : undefined,
      condition: dto.condition as object | undefined,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmAssignmentRule.update({ where: { id }, data });
    }
    return this.prisma.bpmAssignmentRule.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  // BpmSegmentFilter
  async listBpmSegmentFilters(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmSegmentFilter.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getBpmSegmentFilter(id: string) {
    const row = await this.prisma.bpmSegmentFilter.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('BpmSegmentFilter', id);
    return row;
  }

  async upsertBpmSegmentFilter(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      name: dto.name as string,
      code: dto.code as string | undefined,
      filterType: dto.filterType as string | undefined,
      expression: dto.expression as object | undefined,
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmSegmentFilter.update({ where: { id }, data });
    }
    return this.prisma.bpmSegmentFilter.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteBpmSegmentFilter(id: string, actor?: RequestUser) {
    await this.prisma.bpmSegmentFilter.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // BpmArtifactData
  async listBpmArtifactData(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    if (q.type) where.type = q.type;
    return this.prisma.bpmArtifactData.findMany({ where, orderBy: { name: 'asc' } });
  }

  async upsertBpmArtifactData(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      name: dto.name as string,
      code: dto.code as string,
      status: dto.status !== undefined ? Number(dto.status) : undefined,
      type: (dto.type as string) ?? 'grid',
      config: dto.config as object | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmArtifactData.update({ where: { id }, data });
    }
    return this.prisma.bpmArtifactData.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id, status: data.status ?? 1 },
    });
  }

  async deleteBpmArtifactData(id: string, actor?: RequestUser) {
    await this.prisma.bpmArtifactData.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // BpmFormData
  async listBpmFormData(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.nodeId ?? q.nodeKey) where.nodeKey = (q.nodeId ?? q.nodeKey) as string;
    if (q.potId) where.potId = q.potId;
    if (q.instanceId) where.instanceId = q.instanceId;
    return this.prisma.bpmFormData.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async getFormDataByNodeId(nodeId: string, potId?: string, tenantId?: string) {
    const where: Record<string, unknown> = { nodeKey: nodeId, deletedAt: null };
    if (tenantId) where.tenantId = tenantId;
    if (potId) where.potId = potId;
    const row = await this.prisma.bpmFormData.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) {
      return potId ? { nodeId, potId, data: {} } : [];
    }
    return { nodeId: row.nodeKey, potId: row.potId ?? potId ?? '', data: row.data };
  }

  async upsertBpmFormData(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const nodeKey = (dto.nodeId ?? dto.nodeKey) as string;
    const potId = dto.potId as string | undefined;
    const dataPayload = (dto.data ?? dto.formData) as object | undefined;

    if (id) {
      return this.prisma.bpmFormData.update({
        where: { id },
        data: {
          nodeKey: nodeKey ?? undefined,
          potId,
          instanceId: dto.instanceId as string | undefined,
          templateId: this.templateIdFrom(dto),
          data: dataPayload ?? {},
        },
      });
    }

    if (nodeKey && potId) {
      const existing = await this.prisma.bpmFormData.findFirst({
        where: { tenantId: actor.tenantId, nodeKey, potId, deletedAt: null },
      });
      if (existing) {
        return this.prisma.bpmFormData.update({
          where: { id: existing.id },
          data: { data: dataPayload ?? {}, instanceId: dto.instanceId as string | undefined },
        });
      }
    }

    return this.prisma.bpmFormData.create({
      data: {
        tenantId: actor.tenantId,
        nodeKey: nodeKey ?? `node_${Date.now()}`,
        potId,
        instanceId: dto.instanceId as string | undefined,
        templateId: this.templateIdFrom(dto),
        data: dataPayload ?? {},
      },
    });
  }

  // BpmFormPopup
  async listBpmFormPopups(tenantId: string, q: Dto = {}) {
    const where: Record<string, unknown> = this.tenantWhere(tenantId);
    const templateId = this.templateIdFrom(q);
    if (templateId) where.templateId = templateId;
    return this.prisma.bpmFormPopup.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getBpmFormPopup(id: string) {
    const row = await this.prisma.bpmFormPopup.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('BpmFormPopup', id);
    return row;
  }

  async upsertBpmFormPopup(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    const data = {
      templateId: this.templateIdFrom(dto),
      nodeKey: (dto.nodeKey ?? dto.nodeId) as string | undefined,
      bpmFormId: (dto.bpmFormId ?? dto.formId) as string | undefined,
      title: dto.title as string | undefined,
      name: dto.name as string,
      code: dto.code as string | undefined,
      config: dto.config as object | undefined,
      isActive: dto.isActive as boolean | undefined,
      updatedBy: actor.id,
    };
    if (id) {
      return this.prisma.bpmFormPopup.update({ where: { id }, data });
    }
    return this.prisma.bpmFormPopup.create({
      data: { ...data, tenantId: actor.tenantId, createdBy: actor.id },
    });
  }

  async deleteBpmFormPopup(id: string, actor?: RequestUser) {
    await this.prisma.bpmFormPopup.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // Upload
  async saveFileUpload(
    file: Express.Multer.File,
    actor: RequestUser,
    refType?: string,
    refId?: string,
  ) {
    const baseUrl = this.config.get<string>('APP_BASE_URL', 'http://localhost:3000');
    const fileUrl = `${baseUrl}/uploads/${file.filename}`;
    return this.prisma.bpmFileUpload.create({
      data: {
        tenantId: actor.tenantId,
        fileName: file.originalname,
        fileUrl,
        storagePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        refType,
        refId,
        uploadedBy: actor.id,
      },
    });
  }

  async deleteFileUpload(id: string, actor?: RequestUser) {
    await this.prisma.bpmFileUpload.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor?.id },
    });
    return { message: 'Deleted' };
  }

  // FindByCriteria
  async findByCriteria(tenantId: string, dto: Dto) {
    const page = Number(dto.page ?? 1);
    const limit = Number(dto.limit ?? 20);
    const where: Record<string, unknown> = { tenantId };
    if (dto.instanceId) where.instanceId = dto.instanceId;
    if (dto.processId ?? dto.templateId) {
      const instances = await this.prisma.bpmProcessInstance.findMany({
        where: { tenantId, templateId: (dto.processId ?? dto.templateId) as string },
        select: { id: true },
      });
      where.instanceId = { in: instances.map((i) => i.id) };
    }
    if (dto.errorCode) {
      where.data = { path: ['errorCode'], equals: dto.errorCode };
    }
    const [data, total] = await Promise.all([
      this.prisma.bpmInstanceHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: { instance: { include: { template: true, processedObject: true } } },
      }),
      this.prisma.bpmInstanceHistory.count({ where }),
    ]);
    const mapped = data.map((log) => ({
      id: log.id,
      processId: log.instance.templateId,
      processName: log.instance.template.name,
      nodeId: log.toNode ?? log.fromNode,
      nodeName: log.toNode ?? log.fromNode ?? '',
      potId: log.instance.processedObject?.potId ?? log.instance.businessKey ?? '',
      patientName: log.instance.processedObject?.patientName ?? '',
      errorCode: (log.data as Record<string, unknown>)?.errorCode ?? '',
      message: (log.data as Record<string, unknown>)?.message ?? log.eventType,
      createdTime: log.occurredAt.toISOString(),
      stackTrace: (log.data as Record<string, unknown>)?.stackTrace ?? '',
    }));
    return buildPagedResult(mapped, total, page, limit);
  }

  // Rest (external REST call proxy)
  async restCall(dto: Dto) { return { result: null, message: 'REST proxy not configured' }; }
}
