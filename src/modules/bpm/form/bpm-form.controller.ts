import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmFormService } from './bpm-form.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm-form')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmFormController {
  constructor(private bpmFormService: BpmFormService) {}

  // ── BpmForm ───────────────────────────────────────────────────────────────

  @Get('bpmForm/list')
  @ApiOperation({ summary: 'List BPM forms' })
  listForms(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listForms(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('bpmForm/update')
  @ApiOperation({ summary: 'Create or update BPM form' })
  upsertForm(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.upsertForm(body, actor);
  }

  @Delete('bpmForm/delete')
  @ApiOperation({ summary: 'Delete BPM form' })
  deleteForm(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.deleteForm(id, actor);
  }

  @Get('forms/:formId')
  @ApiOperation({ summary: 'Get BPM form by id to render' })
  getFormById(@Param('formId') formId: string) {
    return this.bpmFormService.getFormById(formId);
  }

  // ── BpmFormArtifact ───────────────────────────────────────────────────────

  @Get('bpmFormArtifact/list')
  @ApiOperation({ summary: 'List BPM form artifacts' })
  listArtifacts(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listArtifacts(tenantId, {
      bpmFormId: query.bpmFormId,
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('bpmFormArtifact/get')
  @ApiOperation({ summary: 'Get BPM form artifact' })
  getArtifact(@Query('id') id: string) {
    return this.bpmFormService.getArtifact(id);
  }

  @Post('bpmFormArtifact/update')
  @ApiOperation({ summary: 'Create or update BPM form artifact' })
  upsertArtifact(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.upsertArtifact(body, actor);
  }

  @Post('bpmFormArtifact/update/position')
  @ApiOperation({ summary: 'Update artifact position' })
  updatePosition(@Body() body: { id: string; position: number }, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.updateArtifactPosition(body, actor);
  }

  @Post('bpmFormArtifact/update/config')
  @ApiOperation({ summary: 'Update artifact config' })
  updateConfig(@Body() body: { id: string; config: object }, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.updateArtifactConfig(body, actor);
  }

  @Post('bpmFormArtifact/update/eform')
  @ApiOperation({ summary: 'Update artifact eform config' })
  updateEform(@Body() body: { id: string; eformConfig: object }, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.updateArtifactEform(body, actor);
  }

  @Delete('bpmFormArtifact/delete')
  @ApiOperation({ summary: 'Delete BPM form artifact' })
  deleteArtifact(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.deleteArtifact(id, actor);
  }

  // ── BpmFormMapping ────────────────────────────────────────────────────────

  @Get('formMapping/list')
  @ApiOperation({ summary: 'List form mappings' })
  listFormMappings(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listFormMappings(tenantId, {
      bpmFormId: query.bpmFormId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('formMapping/list/source')
  @ApiOperation({ summary: 'List form mappings (source)' })
  listFormMappingsSource(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listFormMappingsSource(tenantId, query);
  }

  @Get('formMapping/list/target')
  @ApiOperation({ summary: 'List form mappings (target)' })
  listFormMappingsTarget(
    @TenantId() tenantId: string,
    @Query('bpmFormId') bpmFormId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.bpmFormService.listFormMappingsTarget(bpmFormId, tenantId, query);
  }

  @Get('formMapping/get')
  @ApiOperation({ summary: 'Get form mapping' })
  getFormMapping(@Query('id') id: string) {
    return this.bpmFormService.getFormMapping(id);
  }

  @Post('formMapping/update')
  @ApiOperation({ summary: 'Create or update form mapping' })
  upsertFormMapping(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.upsertFormMapping(body, actor);
  }

  @Delete('formMapping/delete')
  @ApiOperation({ summary: 'Delete form mapping' })
  deleteFormMapping(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.deleteFormMapping(id, actor);
  }

  @Post('formMapping/clone')
  @ApiOperation({ summary: 'Clone a form mapping' })
  cloneFormMapping(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.cloneFormMapping(id, actor);
  }

  // businessProcess/* aliases expected by FE
  @Get('businessProcess/bpmForm/list')
  @ApiOperation({ summary: 'List BPM forms (businessProcess alias)' })
  listFormsBPAlias(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listForms(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('businessProcess/formMapping/clone')
  @ApiOperation({ summary: 'Clone form mapping (businessProcess alias)' })
  cloneFormMappingBPAlias(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.cloneFormMapping(id, actor);
  }

  @Post('businessProcess/variableDeclare/update')
  @ApiOperation({ summary: 'Declare variable (businessProcess alias)' })
  upsertVariableBPAlias(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return { id: 'stub', ...body };
  }

  // ── BpmFormProcess ────────────────────────────────────────────────────────

  @Get('bpmFormProcess/list')
  @ApiOperation({ summary: 'List BPM form processes' })
  listFormProcesses(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listFormProcesses(tenantId, {
      bpmFormId: query.bpmFormId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('bpmFormProcess/get')
  @ApiOperation({ summary: 'Get BPM form process' })
  getFormProcess(@Query('id') id: string) {
    return this.bpmFormService.getFormProcess(id);
  }

  @Post('bpmFormProcess/update')
  @ApiOperation({ summary: 'Create or update BPM form process' })
  upsertFormProcess(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.upsertFormProcess(body, actor);
  }

  @Delete('bpmFormProcess/delete')
  @ApiOperation({ summary: 'Delete BPM form process' })
  deleteFormProcess(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.bpmFormService.deleteFormProcess(id, actor);
  }
}

// ── Admin BPM eform list ──────────────────────────────────────────────────────

import { Controller as C2 } from '@nestjs/common';

@ApiTags('bpm-form-admin')
@ApiBearerAuth('JWT')
@C2('adminapi')
export class BpmFormAdminController {
  constructor(private bpmFormService: BpmFormService) {}

  @Get('bpm/list/eform')
  @ApiOperation({ summary: 'List eforms (admin)' })
  listEforms(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.bpmFormService.listEforms(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
