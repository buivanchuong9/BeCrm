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
   * Uses an atomic raw SQL UPDATE to prevent TOCTOU race conditions
   * where two concurrent users both see status='active' and both claim.
   */
  async claimTask(tokenId: string, actor: RequestUser) {
    // First verify tenant ownership
    const existing = await this.prisma.bpmTaskToken.findUnique({
      where: { id: tokenId },
      select: { tenantId: true, status: true, iamAssigneeId: true },
    });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new NotFoundException('BpmTaskToken', tokenId);
    }
    if (existing.status !== 'active') {
      throw new Error(`Token is not claimable (status: ${existing.status})`);
    }

    // Atomic claim: only succeeds if iam_assignee_id IS NULL (not yet claimed)
    const result = await this.prisma.$executeRaw`
      UPDATE bpm.bpm_task_tokens
      SET iam_assignee_id = ${actor.id}::uuid,
          claimed_at      = NOW(),
          updated_by      = ${actor.id}::uuid,
          updated_at      = NOW()
      WHERE id               = ${tokenId}::uuid
        AND status           = 'active'
        AND iam_assignee_id  IS NULL
        AND tenant_id        = ${actor.tenantId}::uuid
    `;

    if (result === 0) {
      // Someone else claimed it between the read and the write
      const current = await this.prisma.bpmTaskToken.findUnique({ where: { id: tokenId } });
      throw new Error(
        `Task already claimed by user ${current?.iamAssigneeId ?? 'unknown'}. Refresh and try again.`,
      );
    }

    return this.prisma.bpmTaskToken.findUnique({ where: { id: tokenId } });
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

    // Merge variables from instance context + new form submission
    const mergedVars = { ...(token.instance.variables as object ?? {}), ...(variables ?? {}) };

    await this.prisma.bpmTaskToken.update({
      where: { id: tokenId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        variables,
        formData: variables,   // Persist E-Form submission data on the token
        updatedBy: actor?.id ?? token.iamAssigneeId ?? token.createdBy,
      },
    });

    // Update instance variables (merge context forward)
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

  /**
   * Delegate/Forward a task to another user.
   * Creates a new token for the target user, marks the current token as delegated.
   */
  async delegateTask(
    tokenId: string,
    targetUserId: string,
    reason: string,
    actor: RequestUser,
  ) {
    const token = await this.prisma.bpmTaskToken.findUnique({
      where: { id: tokenId },
      include: { node: true, instance: true },
    });
    if (!token || token.tenantId !== actor.tenantId) throw new NotFoundException('BpmTaskToken', tokenId);
    if (token.status !== 'active') throw new Error('Only active tasks can be delegated');

    await this.prisma.$transaction(async (tx) => {
      // Cancel the original token
      await tx.bpmTaskToken.update({
        where: { id: tokenId },
        data: { status: 'delegated', updatedBy: actor.id },
      });

      // Create new token for the target user
      await tx.bpmTaskToken.create({
        data: {
          tenantId: token.tenantId,
          instanceId: token.instanceId,
          nodeId: token.nodeId,
          status: 'active',
          iamAssigneeId: targetUserId,
          claimedAt: new Date(), // Auto-claimed for delegated tasks
          variables: token.variables as object ?? undefined,
          slaDueDate: token.slaDueDate ?? undefined,
          delegatedFrom: tokenId,
          delegateReason: reason,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      await tx.bpmInstanceHistory.create({
        data: {
          tenantId: token.tenantId,
          instanceId: token.instanceId,
          eventType: 'task_delegate',
          fromNode: token.node.nodeKey,
          iamActorId: actor.id,
          data: { targetUserId, reason },
          createdBy: actor.id,
        },
      });
    });

    this.eventEmitter.emit('bpm.task.delegated', { tokenId, targetUserId, instanceId: token.instanceId });
    return { message: 'Task delegated', originalTokenId: tokenId, targetUserId };
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

  /**
   * Expression evaluator for ExclusiveGateway and SequenceFlow conditions.
   *
   * Condition shape (stored as JSONB on BpmEdge.condition):
   *   Single:  { field: 'approved', operator: 'eq', value: true }
   *   Compound: { and: [...conditions] } | { or: [...conditions] }
   */
  private evaluateCondition(condition: unknown, variables?: object): boolean {
    if (!condition) return true;
    const vars = (variables ?? {}) as Record<string, unknown>;
    const cond = condition as Record<string, unknown>;

    // Compound conditions
    if (Array.isArray(cond.and)) {
      return (cond.and as unknown[]).every((c) => this.evaluateCondition(c, variables));
    }
    if (Array.isArray(cond.or)) {
      return (cond.or as unknown[]).some((c) => this.evaluateCondition(c, variables));
    }

    // Simple condition: { field, operator, value }
    const field = cond.field as string;
    const operator = cond.operator as string;
    const expected = cond.value;

    if (!field || !operator) return true; // Malformed — default open

    // Support nested field paths: 'form.approved' => vars['form']['approved']
    const actual = field.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
      return undefined;
    }, vars);

    switch (operator) {
      case 'eq':       return actual === expected;
      case 'neq':      return actual !== expected;
      case 'gt':       return Number(actual) > Number(expected);
      case 'lt':       return Number(actual) < Number(expected);
      case 'gte':      return Number(actual) >= Number(expected);
      case 'lte':      return Number(actual) <= Number(expected);
      case 'contains': return String(actual).includes(String(expected));
      case 'startsWith': return String(actual).startsWith(String(expected));
      case 'endsWith': return String(actual).endsWith(String(expected));
      case 'in':       return Array.isArray(expected) && (expected as unknown[]).includes(actual);
      case 'notIn':    return Array.isArray(expected) && !(expected as unknown[]).includes(actual);
      case 'isNull':   return actual === null || actual === undefined;
      case 'isNotNull': return actual !== null && actual !== undefined;
      case 'between': {
        const range = expected as [unknown, unknown];
        return Number(actual) >= Number(range[0]) && Number(actual) <= Number(range[1]);
      }
      default:
        this.logger.warn(`Unknown condition operator '${operator}' on field '${field}' — defaulting to true`);
        return true;
    }
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
