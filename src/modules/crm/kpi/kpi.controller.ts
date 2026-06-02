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

  @Get('kpiTemplate/list') list(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listTemplates(t, Number(p ?? 1), Number(l ?? 20)); }
  @Post('kpiTemplate/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplate(b, a); }
  @Delete('kpiTemplate/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplate(id, a); }

  @Post('kpiTemplateGoal/update') upsertGoalTpl(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplateGoal(b, a); }
  @Delete('kpiTemplateGoal/delete') deleteGoalTpl(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplateGoal(id, a); }

  @Get('kpiSetup/list') listSetup(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSetups(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Post('kpiSetup/update') upsertSetup(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSetup(b, a); }
  @Delete('kpiSetup/delete') deleteSetup(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSetup(id, a); }

  @Post('kpiSetupObject/update') upsertSetupObj(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Delete('kpiSetupObject/delete') deleteSetupObj(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObject(id, a); }

  @Post('kpiGoal/update') upsertGoal(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertGoal(b, a); }
  @Delete('kpiGoal/delete') deleteGoal(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteGoal(id, a); }

  @Get('kpiDatasource/list') getDatasource(@TenantId() t: string) { return this.svc.getDatasource(t); }

  @Get('kpiObject/list') listObjects(@TenantId() t: string) { return this.svc.listObjects(t); }
  @Post('kpiObject/update') upsertObject(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObject(b, a); }
  @Delete('kpiObject/delete') deleteObject(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObject(id, a); }

  @Get('kpiExchange/list') listExchanges(@Query('kpiSetupId') id: string) { return this.svc.listExchanges(id); }

  @Post('kpiApply/apply') apply(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.applyKpi(b, a); }
}
