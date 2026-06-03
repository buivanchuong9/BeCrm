import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { BpmTemplateService, GraphDto } from './bpm-template.service';
import { CreateProcessTemplateDto, UpdateProcessTemplateDto } from './bpm-process.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmTemplateController {
  constructor(private templateService: BpmTemplateService) {}

  @Get('process/list')
  @ApiOperation({ summary: 'List BPM process templates' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.templateService.list(tenantId, {
      name: query.name,
      status: query.status,
      category: query.category,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('process/get')
  @ApiOperation({ summary: 'Get BPM process template with graph' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.templateService.getById(id, tenantId);
  }

  @Post('process/create')
  @ApiOperation({ summary: 'Create BPM process template' })
  @ApiBody({ type: CreateProcessTemplateDto })
  create(
    @Body() body: CreateProcessTemplateDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.create(body, actor);
  }

  @Post('process/update')
  @ApiOperation({ summary: 'Update BPM process template metadata' })
  @ApiBody({ type: UpdateProcessTemplateDto })
  update(
    @Query('id') id: string,
    @Body() body: UpdateProcessTemplateDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.update(id, body, actor);
  }

  @Post('process/graph')
  @ApiOperation({ summary: 'Save/replace BPM workflow graph (nodes + edges)' })
  saveGraph(
    @Query('templateId') templateId: string,
    @Body() graph: GraphDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.saveGraph(templateId, graph, actor);
  }

  @Post('process/publish')
  @ApiOperation({ summary: 'Publish BPM process template (makes it runnable)' })
  publish(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.publish(id, actor);
  }

  @Delete('process/delete')
  @ApiOperation({ summary: 'Delete BPM process template' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.delete(id, actor);
  }

  // ── FE calls these paths — must match exactly (case-sensitive) ──────────────

  // FE: BusinessProcessList.tsx calls /bpmapi/businessProcess/list (capital P)
  @Get('businessProcess/list')
  @ApiOperation({ summary: 'List business processes (FE path — camelCase)' })
  listBPcamel(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.templateService.list(tenantId, {
      name: query.name ?? query.keyword,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // lowercase alias for backward compat
  @Get('businessprocess/list')
  @ApiOperation({ summary: 'List business processes (lowercase alias)' })
  listBusinessProcess(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.listBPcamel(tenantId, query);
  }

  @Get('businessProcess/detail')
  @Get('businessprocess/detail')
  @ApiOperation({ summary: 'Get BPM process detail (FE: SettingBusinessProcess.tsx)' })
  getBusinessProcess(@Query('id') id: string, @Query('processId') processId: string, @TenantId() tenantId: string) {
    return this.templateService.getById(id ?? processId, tenantId);
  }

  @Get('businessProcess/get')
  @Get('businessprocess/get')
  @ApiOperation({ summary: 'Get business process by id' })
  getBusinessProcessAlt(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.templateService.getById(id, tenantId);
  }

  @Post('businessProcess/update/config')
  @Post('businessprocess/update/config')
  @ApiOperation({ summary: 'Update BPMN XML config' })
  updateBpmnConfig(
    @Body() body: { id: string; config: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.update(body.id, { xmlData: body.config } as never, actor);
  }

  @Get('businessProcess/clone')
  @ApiOperation({ summary: 'Clone business process' })
  clone(@Query('id') id: string, @TenantId() tenantId: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.getById(id, tenantId); // stub: return source
  }

  @Post('businessProcess/update')
  @ApiOperation({ summary: 'Update business process metadata' })
  updateProcess(
    @Query('id') id: string,
    @Body() body: UpdateProcessTemplateDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.update(id, body, actor);
  }

  @Delete('businessProcess/delete')
  @ApiOperation({ summary: 'Delete business process' })
  deleteProcess(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.delete(id, actor);
  }
}
