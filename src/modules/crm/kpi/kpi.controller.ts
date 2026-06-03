import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KpiService } from './kpi.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('kpi')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class KpiController {
  constructor(private svc: KpiService) {}

  // ── kpiTemplate ───────────────────────────────────────────────────────────
  @Get('kpiTemplate/list') list(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listTemplates(t, Number(p ?? 1), Number(l ?? 20)); }
  @Post('kpiTemplate/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplate(b, a); }
  @Delete('kpiTemplate/delete') deleteTemplate(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplate(id, a); }

  // ── kpiTemplateGoal ───────────────────────────────────────────────────────
  @Get('kpiTemplateGoal/list') listTemplateGoals(@TenantId() t: string, @Query('templateId') templateId?: string) { return this.svc.listTemplateGoals(t, templateId); }
  @Post('kpiTemplateGoal/update') upsertGoalTpl(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplateGoal(b, a); }
  @Delete('kpiTemplateGoal/delete') deleteGoalTpl(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplateGoal(id, a); }

  // ── kpiSetup ──────────────────────────────────────────────────────────────
  @Get('kpiSetup/list') listSetup(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSetups(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Post('kpiSetup/update') upsertSetup(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSetup(b, a); }
  @Post('kpiSetup/update/web') upsertSetupWeb(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSetup(b, a); }
  @Delete('kpiSetup/delete') deleteSetup(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSetup(id, a); }

  // ── kpiSetupObject ────────────────────────────────────────────────────────
  @Get('kpiSetupObject/list/byKotId') listSetupObjByKot(@Query('kotId') kotId: string, @TenantId() t: string) { return this.svc.listSetupObjects(t, kotId); }
  @Post('kpiSetupObject/update') upsertSetupObj(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Post('kpiSetupObject/update/web') upsertSetupObjWeb(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Delete('kpiSetupObject/delete') deleteSetupObj(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObject(id, a); }

  // ── kpiGoal ───────────────────────────────────────────────────────────────
  @Get('kpiGoal/list') listGoals(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listGoals(t, q); }
  @Get('kpiGoal/get') getGoal(@Query('id') id: string) { return this.svc.getGoal(id); }
  @Post('kpiGoal/update') upsertGoal(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertGoal(b, a); }
  @Delete('kpiGoal/delete') deleteGoal(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteGoal(id, a); }

  // ── kpiDatasource ─────────────────────────────────────────────────────────
  @Get('kpiDatasource/list') getDatasource(@TenantId() t: string) { return this.svc.getDatasource(t); }
  @Post('kpiDatasource/update') upsertDatasource(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { ...b, id: (b.id as string) ?? `kds-${Date.now()}` }; }
  @Delete('kpiDatasource/delete') deleteDatasource(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── kpiObject ─────────────────────────────────────────────────────────────
  @Get('kpiObject/list') listObjects(@TenantId() t: string) { return this.svc.listObjects(t); }
  @Get('kpiObject/get') getObject(@Query('id') id: string) { return this.svc.getObject(id); }
  @Get('kpiObject/get/byObject') getObjectByRef(@Query('objectType') objectType: string, @Query('objectId') objectId: string, @TenantId() t: string) { return this.svc.getObjectByRef(t, objectType, objectId); }
  @Get('kpiObject/employee/result') getEmployeeResult(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.getEmployeeResult(t, q); }
  @Post('kpiObject/update') upsertObject(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Post('kpiObject/update/web') upsertObjectWeb(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Delete('kpiObject/delete') deleteObject(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObject(id, a); }

  // ── kpiExchange ───────────────────────────────────────────────────────────
  @Get('kpiExchange/list') listExchanges(@Query('kpiSetupId') id: string) { return this.svc.listExchanges(id); }
  @Get('kpiExchange/get') getExchange(@Query('id') id: string) { return this.svc.getExchange(id); }
  @Post('kpiExchange/update') upsertExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertExchange(b, a); }
  @Delete('kpiExchange/delete') deleteExchange(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteExchange(id, a); }

  // ── kpiApply ──────────────────────────────────────────────────────────────
  @Get('kpiApply/list') listApply(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listApply(t, q); }
  @Get('kpiApply/get/byCampaignId') getApplyByCampaign(@Query('campaignId') cid: string, @TenantId() t: string) { return this.svc.getApplyByCampaign(t, cid); }
  @Post('kpiApply/update') upsertApply(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertApply(b, a); }
  @Post('kpiApply/apply') apply(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.applyKpi(b, a); }
  @Delete('kpiApply/delete') deleteApply(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteApply(id, a); }

  // ── kpi (main) ────────────────────────────────────────────────────────────
  @Get('kpi/list') listKpi(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSetups(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Post('kpi/update') upsertKpi(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSetup(b, a); }
  @Delete('kpi/delete') deleteKpi(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSetup(id, a); }
  @Post('campaign/update/kpi') updateCampaignKpi(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertApply(b, a); }
  @Get('campaignSale/interaction/kpis') getCampaignSaleKpi(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listApply(t, q); }
  @Get('campaignSale/interaction/employee') getCampaignSaleEmployee(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.getEmployeeResult(t, q); }
}
