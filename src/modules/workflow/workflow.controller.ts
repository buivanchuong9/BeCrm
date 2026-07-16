import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequireIdempotencyKey } from '../../common/idempotency/idempotency-key.decorator';
import {
  ActivateWorkflowRequest,
  CreateWorkflowTemplateRequest,
  NodePositionsRequest,
  ReasonedVersionRequest,
  ReassignTaskRequest,
  UpdateWorkflowTemplateRequest,
  VersionOnlyRequest,
} from './dto/workflow-template.dto';
import { ReplaceStepsRequest, WorkflowStepDefinitionDto } from './dto/workflow-step-definition.dto';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowRuntimeService } from './workflow-runtime.service';

function context(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

class TemplateQuery {
  @IsOptional() @IsString() specialty?: string;
}

class RecommendQuery {
  @IsString() specialty!: string;
}
class StepCreateRequest extends WorkflowStepDefinitionDto {
  @IsInt() @Min(1) rowVersion!: number;
}
class StepPatchRequest {
  @IsObject() patch!: Partial<WorkflowStepDefinitionDto>;
  @IsInt() @Min(1) rowVersion!: number;
}
class StepDeleteQuery {
  @IsInt() @Min(1) rowVersion!: number;
}
class ReorderRequest {
  @IsArray() @IsString({ each: true }) orderedCodes!: string[];
  @IsInt() @Min(1) rowVersion!: number;
}
class EdgeRequest {
  @IsString() sourceCode!: string;
  @IsString() targetCode!: string;
  @IsInt() @Min(1) rowVersion!: number;
}

@Controller({ path: 'workflow-templates', version: '1' })
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: TemplateQuery) {
    return this.service.list(principal, query.specialty);
  }

  @Get('recommend')
  recommend(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: RecommendQuery) {
    return this.service.recommend(principal, query.specialty);
  }

  @RequireIdempotencyKey()
  @Post()
  create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateWorkflowTemplateRequest,
    @Req() req: Request,
  ) {
    return this.service.create(principal, dto, context(req));
  }

  @Patch(':templateId')
  update(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateWorkflowTemplateRequest,
    @Req() req: Request,
  ) {
    return this.service.update(principal, templateId, dto, context(req));
  }

  @Get(':templateId/versions')
  versions(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.service.listVersions(principal, templateId);
  }

  @RequireIdempotencyKey()
  @Post(':templateId/versions')
  createVersion(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Req() req: Request,
  ) {
    return this.service.createDraftFromPublished(principal, templateId, context(req));
  }
}

@Controller({ path: 'workflow-template-versions', version: '1' })
export class WorkflowTemplateVersionsController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @Get(':versionId')
  detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.service.getVersion(principal, versionId);
  }

  @Put(':versionId/steps')
  replaceSteps(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: ReplaceStepsRequest,
    @Req() req: Request,
  ) {
    return this.service.replaceSteps(principal, versionId, dto, context(req));
  }

  @Post(':versionId/steps') addStep(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Body() d: StepCreateRequest,
    @Req() r: Request,
  ) {
    const { rowVersion, ...step } = d;
    return this.service.addStep(p, id, step, rowVersion, context(r));
  }
  @Patch(':versionId/steps/:code') updateStep(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Param('code') code: string,
    @Body() d: StepPatchRequest,
    @Req() r: Request,
  ) {
    return this.service.updateStep(p, id, code, d.patch, d.rowVersion, context(r));
  }
  @Delete(':versionId/steps/:code') deleteStep(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Param('code') code: string,
    @Query() q: StepDeleteQuery,
    @Req() r: Request,
  ) {
    return this.service.deleteStep(p, id, code, q.rowVersion, context(r));
  }
  @Post(':versionId/steps/reorder') reorder(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Body() d: ReorderRequest,
    @Req() r: Request,
  ) {
    return this.service.reorderSteps(p, id, d.orderedCodes, d.rowVersion, context(r));
  }
  @Post(':versionId/edges') addEdge(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Body() d: EdgeRequest,
    @Req() r: Request,
  ) {
    return this.service.setEdge(p, id, d.sourceCode, d.targetCode, false, d.rowVersion, context(r));
  }
  @Delete(':versionId/edges') deleteEdge(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) id: string,
    @Body() d: EdgeRequest,
    @Req() r: Request,
  ) {
    return this.service.setEdge(p, id, d.sourceCode, d.targetCode, true, d.rowVersion, context(r));
  }

  @Put(':versionId/node-positions')
  positions(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: NodePositionsRequest,
  ) {
    return this.service.updateNodePositions(principal, versionId, dto);
  }

  @Post(':versionId/publish')
  publish(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: VersionOnlyRequest,
    @Req() req: Request,
  ) {
    return this.service.publish(principal, versionId, dto.version, context(req));
  }

  @Post(':versionId/archive')
  archive(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: VersionOnlyRequest,
    @Req() req: Request,
  ) {
    return this.service.archive(principal, versionId, dto.version, context(req));
  }
}

@Controller({ path: 'encounters', version: '1' })
export class EncounterWorkflowController {
  constructor(private readonly runtime: WorkflowRuntimeService) {}

  @RequireIdempotencyKey()
  @Post(':encounterId/workflow/activate')
  activate(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: ActivateWorkflowRequest,
    @Req() req: Request,
  ) {
    return this.runtime.activate(principal, encounterId, dto.templateId, context(req));
  }
}

class InstanceQuery {
  @IsUUID() patientId!: string;
}

@Controller({ path: 'workflow-instances', version: '1' })
export class WorkflowInstancesController {
  constructor(private readonly runtime: WorkflowRuntimeService) {}

  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: InstanceQuery) {
    return this.runtime.listForPatient(principal, query.patientId);
  }

  @Get(':instanceId')
  detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
  ) {
    return this.runtime.getInstance(principal, id);
  }

  @Get(':instanceId/identity-verify')
  verify(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
  ) {
    return this.runtime.verifyIdentity(principal, id);
  }

  @Post(':instanceId/suspend')
  suspend(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
    @Body() dto: ReasonedVersionRequest,
    @Req() req: Request,
  ) {
    return this.runtime.suspend(principal, id, dto.reason, dto.version, context(req));
  }

  @Post(':instanceId/resume')
  resume(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
    @Body() dto: VersionOnlyRequest,
    @Req() req: Request,
  ) {
    return this.runtime.resume(principal, id, dto.version, context(req));
  }

  @Post(':instanceId/cancel')
  cancel(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
    @Body() dto: ReasonedVersionRequest,
    @Req() req: Request,
  ) {
    return this.runtime.cancel(principal, id, dto.reason, dto.version, context(req));
  }

  @Post(':instanceId/complete')
  complete(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('instanceId', ParseUUIDPipe) id: string,
    @Body() dto: VersionOnlyRequest,
    @Req() req: Request,
  ) {
    return this.runtime.complete(principal, id, dto.version, context(req));
  }
}

class TaskQuery {
  @IsOptional() @IsUUID() encounterId?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional()
  @IsIn([
    'pending',
    'blocked',
    'ready',
    'assigned',
    'accepted',
    'in_progress',
    'waiting_for_patient',
    'waiting_for_result',
    'waiting_for_approval',
    'completed',
    'failed',
    'rejected',
    'redo_required',
    'skipped',
    'cancelled',
    'expired',
    'escalated',
  ])
  status?: never;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() urgency?: string;
}

@Controller({ path: 'workflow-tasks', version: '1' })
export class WorkflowTasksController {
  constructor(private readonly runtime: WorkflowRuntimeService) {}

  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: TaskQuery) {
    return this.runtime.listTasks(principal, query);
  }

  @Post(':taskId/accept')
  accept(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('taskId', ParseUUIDPipe) id: string,
    @Body() dto: VersionOnlyRequest,
    @Req() req: Request,
  ) {
    return this.runtime.claim(principal, id, dto.version, context(req));
  }

  @Post(':taskId/start')
  start(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: VersionOnlyRequest,
    @Req() r: Request,
  ) {
    return this.runtime.start(p, id, d.version, context(r));
  }

  @Post(':taskId/complete')
  complete(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: VersionOnlyRequest,
    @Req() r: Request,
  ) {
    return this.runtime.completeTask(p, id, d.version, context(r));
  }

  @Post(':taskId/redo')
  redo(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: ReasonedVersionRequest,
    @Req() r: Request,
  ) {
    return this.runtime.requestRedo(p, id, d.reason, d.version, context(r));
  }

  @Post(':taskId/reject')
  reject(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: ReasonedVersionRequest,
    @Req() r: Request,
  ) {
    return this.runtime.reject(p, id, d.reason, d.version, context(r));
  }

  @Post(':taskId/escalate')
  escalate(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: ReasonedVersionRequest,
    @Req() r: Request,
  ) {
    return this.runtime.escalate(p, id, d.reason, d.version, context(r));
  }

  @Post(':taskId/skip')
  skip(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: ReasonedVersionRequest,
    @Req() r: Request,
  ) {
    return this.runtime.skip(p, id, d.reason, d.version, context(r));
  }

  @Post(':taskId/reassign')
  reassign(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('taskId') id: string,
    @Body() d: ReassignTaskRequest,
    @Req() r: Request,
  ) {
    return this.runtime.reassign(p, id, d.assigneeId, d.version, context(r));
  }
}
