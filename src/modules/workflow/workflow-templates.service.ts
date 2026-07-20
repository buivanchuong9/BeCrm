import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { WorkflowTemplatesRepository } from './workflow-templates.repository';
import {
  assertHasRole,
  TEMPLATE_AUTHOR_ROLES,
  TEMPLATE_PUBLISH_ROLES,
} from './policies/workflow-policies';
import {
  validateStepGraph,
  assertNoMandatoryStepRemoved,
  WorkflowStepDefinition,
} from './workflow-step-graph.util';
import {
  toWorkflowTemplateResponse,
  toWorkflowTemplateVersionResponse,
} from './workflow-response.mapper';
import {
  CreateWorkflowTemplateRequest,
  UpdateWorkflowTemplateRequest,
  NodePositionsRequest,
} from './dto/workflow-template.dto';
import { ReplaceStepsRequest } from './dto/workflow-step-definition.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

function authoringOrganizationId(principal: AuthenticatedPrincipal): string {
  const membership = principal.memberships.find((m) => TEMPLATE_AUTHOR_ROLES.includes(m.role));
  if (!membership) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This role cannot author workflow templates.');
  }
  return membership.organizationId;
}

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: WorkflowTemplatesRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    principal: AuthenticatedPrincipal,
    dto: CreateWorkflowTemplateRequest,
    context: RequestContext,
  ) {
    const organizationId = authoringOrganizationId(principal);

    const result = await this.prisma.$transaction(async (tx) => {
      const template = await this.repo.create(tx, {
        organizationId,
        name: dto.name,
        specialty: dto.specialty,
        description: dto.description,
        createdBy: principal.userId,
      });
      const version = await this.repo.createVersion(tx, {
        templateId: template.id,
        versionNumber: 1,
        status: 'draft',
        steps: [],
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template.created',
          resourceType: 'workflow_template',
          resourceId: template.id,
          organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return { template, version };
    });

    return {
      data: {
        ...toWorkflowTemplateResponse(result.template),
        draftVersion: toWorkflowTemplateVersionResponse(result.version),
      },
    };
  }

  async update(
    principal: AuthenticatedPrincipal,
    templateId: string,
    dto: UpdateWorkflowTemplateRequest,
    context: RequestContext,
  ) {
    const template = await this.repo.findById(templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    assertHasRole(
      principal,
      template.organizationId,
      TEMPLATE_AUTHOR_ROLES,
      'This role cannot edit workflow templates.',
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.update(tx, templateId, dto.version, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.specialty !== undefined ? { specialty: dto.specialty } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The template was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template.updated',
          resourceType: 'workflow_template',
          resourceId: templateId,
          organizationId: template.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTemplate.findUniqueOrThrow({ where: { id: templateId } });
    });

    return { data: toWorkflowTemplateResponse(updated) };
  }

  async list(principal: AuthenticatedPrincipal, specialty?: string) {
    const organizationId = authoringOrganizationIdForRead(principal);
    const rows = await this.repo.list(organizationId, specialty);
    return { data: rows.map(toWorkflowTemplateResponse) };
  }

  async recommend(principal: AuthenticatedPrincipal, specialty: string) {
    const organizationId = principal.memberships[0]?.organizationId;
    if (!organizationId) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', 'No organization membership.');
    }
    const match = await this.repo.recommend(organizationId, specialty);
    if (!match) {
      throw new NotFoundAppError('No matching published workflow template found.');
    }
    return { data: toWorkflowTemplateResponse(match) };
  }

  async listVersions(_principal: AuthenticatedPrincipal, templateId: string) {
    const template = await this.repo.findById(templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    const rows = await this.repo.listVersions(templateId);
    return { data: rows.map(toWorkflowTemplateVersionResponse) };
  }

  async getVersion(_principal: AuthenticatedPrincipal, versionId: string) {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new NotFoundAppError('Workflow template version not found.');
    }
    return { data: toWorkflowTemplateVersionResponse(version) };
  }

  async createDraftFromPublished(
    principal: AuthenticatedPrincipal,
    templateId: string,
    context: RequestContext,
  ) {
    const template = await this.repo.findById(templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    assertHasRole(
      principal,
      template.organizationId,
      TEMPLATE_AUTHOR_ROLES,
      'This role cannot author workflow templates.',
    );
    if (!template.latestPublishedVersionId) {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        'This template has no published version to branch from.',
      );
    }
    const published = await this.repo.findVersionById(template.latestPublishedVersionId);
    if (!published) {
      throw new NotFoundAppError('Published version not found.');
    }
    const nextNumber = await this.repo.nextVersionNumber(templateId);

    const draft = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.createVersion(tx, {
        templateId,
        versionNumber: nextNumber,
        status: 'draft',
        steps: published.steps as never,
        nodePositions: published.nodePositions as never,
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template_version.draft_created',
          resourceType: 'workflow_template_version',
          resourceId: created.id,
          organizationId: template.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toWorkflowTemplateVersionResponse(draft) };
  }

  private async loadDraftVersionForEdit(principal: AuthenticatedPrincipal, versionId: string) {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new NotFoundAppError('Workflow template version not found.');
    }
    const template = await this.repo.findById(version.templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    assertHasRole(
      principal,
      template.organizationId,
      TEMPLATE_AUTHOR_ROLES,
      'This role cannot edit workflow templates.',
    );
    if (version.status !== 'draft') {
      throw new ConflictAppError('INVALID_STATE_TRANSITION', 'Only a draft version can be edited.');
    }
    return { version, template };
  }

  async replaceSteps(
    principal: AuthenticatedPrincipal,
    versionId: string,
    dto: ReplaceStepsRequest,
    context: RequestContext,
  ) {
    const { version, template } = await this.loadDraftVersionForEdit(principal, versionId);
    const nextSteps = dto.steps as unknown as WorkflowStepDefinition[];
    validateStepGraph(nextSteps);
    assertNoMandatoryStepRemoved(version.steps as unknown as WorkflowStepDefinition[], nextSteps);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.updateVersion(tx, versionId, dto.rowVersion, {
        steps: nextSteps as never,
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The draft was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template_version.steps_replaced',
          resourceType: 'workflow_template_version',
          resourceId: versionId,
          organizationId: template.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTemplateVersion.findUniqueOrThrow({ where: { id: versionId } });
    });

    return { data: toWorkflowTemplateVersionResponse(updated) };
  }

  async addStep(
    principal: AuthenticatedPrincipal,
    versionId: string,
    step: WorkflowStepDefinition,
    rowVersion: number,
    context: RequestContext,
  ) {
    const current = await this.repo.findVersionById(versionId);
    if (!current) throw new NotFoundAppError('Workflow template version not found.');
    return this.replaceSteps(
      principal,
      versionId,
      {
        steps: [...(current.steps as unknown as WorkflowStepDefinition[]), step] as never,
        rowVersion,
      },
      context,
    );
  }
  async updateStep(
    principal: AuthenticatedPrincipal,
    versionId: string,
    code: string,
    patch: Partial<WorkflowStepDefinition>,
    rowVersion: number,
    context: RequestContext,
  ) {
    const current = await this.repo.findVersionById(versionId);
    if (!current) throw new NotFoundAppError('Workflow template version not found.');
    const steps = current.steps as unknown as WorkflowStepDefinition[];
    if (!steps.some((step) => step.code === code))
      throw new NotFoundAppError('Workflow step not found.');
    return this.replaceSteps(
      principal,
      versionId,
      {
        steps: steps.map((step) =>
          step.code === code ? { ...step, ...patch, code } : step,
        ) as never,
        rowVersion,
      },
      context,
    );
  }
  async deleteStep(
    principal: AuthenticatedPrincipal,
    versionId: string,
    code: string,
    rowVersion: number,
    context: RequestContext,
  ) {
    const current = await this.repo.findVersionById(versionId);
    if (!current) throw new NotFoundAppError('Workflow template version not found.');
    const steps = current.steps as unknown as WorkflowStepDefinition[];
    if (!steps.some((step) => step.code === code))
      throw new NotFoundAppError('Workflow step not found.');
    return this.replaceSteps(
      principal,
      versionId,
      {
        steps: steps
          .filter((step) => step.code !== code)
          .map((step) => ({
            ...step,
            prerequisiteStepCodes: step.prerequisiteStepCodes.filter(
              (dependency) => dependency !== code,
            ),
          })) as never,
        rowVersion,
      },
      context,
    );
  }
  async reorderSteps(
    principal: AuthenticatedPrincipal,
    versionId: string,
    orderedCodes: string[],
    rowVersion: number,
    context: RequestContext,
  ) {
    const current = await this.repo.findVersionById(versionId);
    if (!current) throw new NotFoundAppError('Workflow template version not found.');
    const steps = current.steps as unknown as WorkflowStepDefinition[];
    if (
      orderedCodes.length !== steps.length ||
      new Set(orderedCodes).size !== steps.length ||
      orderedCodes.some((code) => !steps.some((step) => step.code === code))
    )
      throw new ValidationAppError([
        {
          field: 'orderedCodes',
          code: 'VALIDATION_FAILED',
          message: 'orderedCodes must contain every step exactly once.',
        },
      ]);
    const byCode = new Map(steps.map((step) => [step.code, step]));
    return this.replaceSteps(
      principal,
      versionId,
      { steps: orderedCodes.map((code) => byCode.get(code)!) as never, rowVersion },
      context,
    );
  }
  async setEdge(
    principal: AuthenticatedPrincipal,
    versionId: string,
    sourceCode: string,
    targetCode: string,
    remove: boolean,
    rowVersion: number,
    context: RequestContext,
  ) {
    const current = await this.repo.findVersionById(versionId);
    if (!current) throw new NotFoundAppError('Workflow template version not found.');
    const steps = current.steps as unknown as WorkflowStepDefinition[];
    if (
      !steps.some((step) => step.code === sourceCode) ||
      !steps.some((step) => step.code === targetCode)
    )
      throw new NotFoundAppError('Workflow step not found.');
    const next = steps.map((step) =>
      step.code !== targetCode
        ? step
        : {
            ...step,
            prerequisiteStepCodes: remove
              ? step.prerequisiteStepCodes.filter((code) => code !== sourceCode)
              : [...new Set([...step.prerequisiteStepCodes, sourceCode])],
          },
    );
    return this.replaceSteps(principal, versionId, { steps: next as never, rowVersion }, context);
  }

  async updateNodePositions(
    principal: AuthenticatedPrincipal,
    versionId: string,
    dto: NodePositionsRequest,
  ) {
    const { version } = await this.loadDraftVersionForEdit(principal, versionId);
    const merged = {
      ...((version.nodePositions as Record<string, { x: number; y: number }> | null) ?? {}),
      ...dto.positions,
    };
    const updated = await this.prisma.workflowTemplateVersion.update({
      where: { id: versionId },
      data: { nodePositions: merged, rowVersion: { increment: 1 } },
    });
    return { data: toWorkflowTemplateVersionResponse(updated) };
  }

  async publish(
    principal: AuthenticatedPrincipal,
    versionId: string,
    expectedRowVersion: number,
    context: RequestContext,
  ) {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new NotFoundAppError('Workflow template version not found.');
    }
    const template = await this.repo.findById(version.templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    assertHasRole(
      principal,
      template.organizationId,
      TEMPLATE_PUBLISH_ROLES,
      'Only a medical administrator may publish a workflow template.',
    );
    if (version.status !== 'draft') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        'Only a draft version can be published.',
      );
    }
    const steps = version.steps as unknown as WorkflowStepDefinition[];
    if (steps.length === 0) {
      throw new ValidationAppError(
        [{ field: 'steps', code: 'VALIDATION_FAILED' }],
        'A version needs at least one step to publish.',
      );
    }

    const published = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.updateVersion(tx, versionId, expectedRowVersion, {
        status: 'published',
        publishedAt: new Date(),
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The version was modified by another request.',
        );
      }
      if (template.latestPublishedVersionId) {
        await tx.workflowTemplateVersion.updateMany({
          where: { id: template.latestPublishedVersionId, status: 'published' },
          data: { status: 'deprecated' },
        });
      }
      await this.repo.setLatestPublishedVersion(tx, template.id, versionId);
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template_version.published',
          resourceType: 'workflow_template_version',
          resourceId: versionId,
          organizationId: template.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTemplateVersion.findUniqueOrThrow({ where: { id: versionId } });
    });

    return { data: toWorkflowTemplateVersionResponse(published) };
  }

  async archive(
    principal: AuthenticatedPrincipal,
    versionId: string,
    expectedRowVersion: number,
    context: RequestContext,
  ) {
    const version = await this.repo.findVersionById(versionId);
    if (!version) {
      throw new NotFoundAppError('Workflow template version not found.');
    }
    const template = await this.repo.findById(version.templateId);
    if (!template) {
      throw new NotFoundAppError('Workflow template not found.');
    }
    assertHasRole(
      principal,
      template.organizationId,
      TEMPLATE_PUBLISH_ROLES,
      'Only a medical administrator may archive a workflow template.',
    );

    const archived = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.updateVersion(tx, versionId, expectedRowVersion, {
        status: 'archived',
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The version was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'workflow_template_version.archived',
          resourceType: 'workflow_template_version',
          resourceId: versionId,
          organizationId: template.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.workflowTemplateVersion.findUniqueOrThrow({ where: { id: versionId } });
    });

    return { data: toWorkflowTemplateVersionResponse(archived) };
  }
}

function authoringOrganizationIdForRead(principal: AuthenticatedPrincipal): string {
  const orgId = principal.memberships[0]?.organizationId;
  if (!orgId) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'No organization membership.');
  }
  return orgId;
}
