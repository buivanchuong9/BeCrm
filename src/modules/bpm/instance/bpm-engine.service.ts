import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type TemplateNode = { id: string; nodeKey: string; nodeType: string; config: unknown };
type TemplateEdge = { fromNodeId: string; toNodeId: string; condition: unknown };

/**
 * BPM Engine — lightweight internal workflow runtime.
 *
 * Supported node types:
 *   Start              — entry point, auto-complete on instance start
 *   End                — terminates the instance
 *   UserTask           — waits for a human to claim + complete
 *   ApprovalTask       — waits for an approval decision
 *   ExclusiveGateway   — evaluates condition on outgoing edges, follows one path
 */
@Injectable()
export class BpmEngineService {
  private readonly logger = new Logger(BpmEngineService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start a new process instance for a given published template.
   * Creates the initial token on the Start node and auto-advances through it.
   */
  async startProcess(
    templateId: string,
    dto: { refType?: string; refId?: string; variables?: object },
    actor: RequestUser,
  ) {
    const template = await this.prisma.bpmProcessTemplate.findFirst({
      where: { id: templateId, tenantId: actor.tenantId, status: 'published', deletedAt: null },
      include: {
        nodes: { where: { deletedAt: null } },
        edges: true,
      },
    });
    if (!template) throw new NotFoundException('Published BpmProcessTemplate', templateId);

    const nodes = template.nodes as TemplateNode[];
    const startNode = nodes.find((n) => n.nodeType === 'Start');
    if (!startNode) throw new Error('Process template has no Start node');

    const instance = await this.prisma.bpmProcessInstance.create({
      data: {
        tenantId: actor.tenantId,
        templateId,
        refType: dto.refType,
        refId: dto.refId,
        status: 'running',
        iamStartedBy: actor.id,
        variables: dto.variables,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await this.prisma.bpmInstanceHistory.create({
      data: {
        tenantId: actor.tenantId,
        instanceId: instance.id,
        eventType: 'start',
        toNode: startNode.nodeKey,
        iamActorId: actor.id,
        data: dto.variables,
        createdBy: actor.id,
      },
    });

    // Auto-advance past Start node
    await this.advanceFromNode(instance.id, startNode, template, actor);

    this.eventEmitter.emit('bpm.instance.started', { instanceId: instance.id, templateId });
    return this.prisma.bpmProcessInstance.findUnique({
      where: { id: instance.id },
      include: { tokens: true },
    });
  }

  /**
   * Claim a UserTask token — assign it to the actor.
   */
  async claimTask(tokenId: string, actor: RequestUser) {
    const token = await this.prisma.bpmTaskToken.findUnique({ where: { id: tokenId } });
    if (!token || token.tenantId !== actor.tenantId) throw new NotFoundException('BpmTaskToken', tokenId);
    if (token.status !== 'active') throw new Error('Token is not in active state');

    return this.prisma.bpmTaskToken.update({
      where: { id: tokenId },
      data: {
        iamAssigneeId: actor.id,
        claimedAt: new Date(),
        updatedBy: actor.id,
      },
    });
  }

  /**
   * Complete a UserTask token — advance the engine to next node.
   */
  async completeTask(tokenId: string, variables?: object, actor?: RequestUser) {
    const token = await this.prisma.bpmTaskToken.findUnique({
      where: { id: tokenId },
      include: { node: { include: { fromEdges: true } }, instance: true },
    });
    if (!token) throw new NotFoundException('BpmTaskToken', tokenId);

    const template = await this.prisma.bpmProcessTemplate.findUnique({
      where: { id: token.instance.templateId },
      include: { nodes: { where: { deletedAt: null } }, edges: true },
    });
    if (!template) throw new NotFoundException('BpmProcessTemplate', token.instance.templateId);

    // Merge variables
    const mergedVars = { ...(token.instance.variables as object ?? {}), ...(variables ?? {}) };

    await this.prisma.bpmTaskToken.update({
      where: { id: tokenId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        variables,
        updatedBy: actor?.id ?? token.iamAssigneeId ?? token.createdBy,
      },
    });

    // Update instance variables
    await this.prisma.bpmProcessInstance.update({
      where: { id: token.instanceId },
      data: { variables: mergedVars, updatedBy: actor?.id ?? token.createdBy },
    });

    await this.prisma.bpmInstanceHistory.create({
      data: {
        tenantId: token.tenantId,
        instanceId: token.instanceId,
        eventType: 'task_complete',
        fromNode: token.node.nodeKey,
        iamActorId: actor?.id ?? token.iamAssigneeId ?? undefined,
        data: variables,
        createdBy: actor?.id ?? token.createdBy,
      },
    });

    const dummyActor: RequestUser = actor ?? {
      id: token.createdBy,
      tenantId: token.tenantId,
      username: 'system',
      roles: [],
      permissions: [],
    };

    await this.advanceFromNode(token.instanceId, token.node, template, dummyActor, mergedVars);
    return { message: 'Task completed', tokenId };
  }

  private async advanceFromNode(
    instanceId: string,
    fromNode: { id: string; nodeKey: string; nodeType: string },
    template: { nodes: Array<{ id: string; nodeKey: string; nodeType: string; config: unknown }>; edges: Array<{ fromNodeId: string; toNodeId: string; condition: unknown }> },
    actor: RequestUser,
    variables?: object,
  ) {
    if (fromNode.nodeType === 'End') {
      await this.completeInstance(instanceId, actor);
      return;
    }

    const outEdges = template.edges.filter((e) => e.fromNodeId === fromNode.id);

    if (fromNode.nodeType === 'ExclusiveGateway') {
      const selectedEdge = outEdges.find((e) => this.evaluateCondition(e.condition, variables));
      if (!selectedEdge) {
        this.logger.warn(`ExclusiveGateway ${fromNode.nodeKey} has no matching condition`);
        return;
      }
      const nextNode = template.nodes.find((n) => n.id === selectedEdge.toNodeId);
      if (!nextNode) return;
      await this.createToken(instanceId, nextNode, actor, variables);
      if (nextNode.nodeType === 'Start' || nextNode.nodeType === 'ExclusiveGateway') {
        await this.advanceFromNode(instanceId, nextNode, template, actor, variables);
      }
      return;
    }

    // For Start node: auto-advance to all outgoing edges
    for (const edge of outEdges) {
      const nextNode = template.nodes.find((n) => n.id === edge.toNodeId);
      if (!nextNode) continue;

      if (fromNode.nodeType === 'Start') {
        await this.advanceFromNode(instanceId, nextNode, template, actor, variables);
      } else {
        await this.createToken(instanceId, nextNode, actor, variables);
      }
    }
  }

  private async createToken(
    instanceId: string,
    node: { id: string; nodeKey: string; nodeType: string; config: unknown },
    actor: RequestUser,
    variables?: object,
  ) {
    if (node.nodeType === 'End') {
      await this.completeInstance(instanceId, actor);
      return;
    }

    const token = await this.prisma.bpmTaskToken.create({
      data: {
        tenantId: actor.tenantId,
        instanceId,
        nodeId: node.id,
        status: 'active',
        variables,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await this.prisma.bpmInstanceHistory.create({
      data: {
        tenantId: actor.tenantId,
        instanceId,
        eventType: 'token_created',
        toNode: node.nodeKey,
        iamActorId: actor.id,
        createdBy: actor.id,
      },
    });

    this.eventEmitter.emit('bpm.task.created', { tokenId: token.id, nodeType: node.nodeType, instanceId });
    return token;
  }

  private async completeInstance(instanceId: string, actor: RequestUser) {
    await this.prisma.bpmProcessInstance.update({
      where: { id: instanceId },
      data: { status: 'completed', completedAt: new Date(), updatedBy: actor.id },
    });
    await this.prisma.bpmInstanceHistory.create({
      data: {
        tenantId: actor.tenantId,
        instanceId,
        eventType: 'completed',
        iamActorId: actor.id,
        createdBy: actor.id,
      },
    });
    this.eventEmitter.emit('bpm.instance.completed', { instanceId });
    this.logger.log(`Process instance ${instanceId} completed`);
  }

  private evaluateCondition(condition: unknown, variables?: object): boolean {
    if (!condition) return true;
    // TODO(UNKNOWN): implement a proper condition evaluator (JSONLogic or similar)
    // For now, always returns true for the first edge
    return true;
  }

  async getInstanceHistory(instanceId: string, tenantId: string) {
    return this.prisma.bpmInstanceHistory.findMany({
      where: { instanceId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async getKanbanView(tenantId: string, templateId: string) {
    const template = await this.prisma.bpmProcessTemplate.findFirst({
      where: { id: templateId, tenantId, deletedAt: null },
      include: { nodes: { where: { deletedAt: null } } },
    });
    if (!template) throw new NotFoundException('BpmProcessTemplate', templateId);

    const tokensByNode = await this.prisma.bpmTaskToken.groupBy({
      by: ['nodeId'],
      where: { instance: { templateId }, status: 'active' },
      _count: { id: true },
    });

    const nodes = template.nodes as TemplateNode[];
    const tokensByNodeTyped = tokensByNode as Array<{ nodeId: string; _count: { id: number } }>;
    return nodes.map((node) => ({
      node,
      activeTokens: tokensByNodeTyped.find((t) => t.nodeId === node.id)?._count.id ?? 0,
    }));
  }
}
