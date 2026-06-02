import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('contract')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class ContractController {
  constructor(private svc: ContractService) {}

  // ── Contract ──────────────────────────────────────────────────────────────

  @Get('contract/list') @ApiOperation({ summary: 'List contracts' })
  list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('contract') @ApiOperation({ summary: 'Get contract detail' })
  getById(@Query('id') id: string, @TenantId() t: string) { return this.svc.getById(id, t); }

  @Get('contract/get') @ApiOperation({ summary: 'Get contract detail (alt)' })
  getById2(@Query('id') id: string, @TenantId() t: string) { return this.svc.getById(id, t); }

  @Post('contract/update') @ApiOperation({ summary: 'Create or update contract' })
  upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }

  @Post('contract/update/status') @ApiOperation({ summary: 'Update contract status' })
  updateStatus(@Body() b: { id: string; status: string }, @CurrentUser() a: RequestUser) { return this.svc.updateStatus(b.id, b.status, a); }

  @Delete('contract/delete') @ApiOperation({ summary: 'Delete contract' })
  delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }

  @Get('contract/alert/get') @ApiOperation({ summary: 'Get contract alert config' })
  getAlert(@Query('id') id: string) { return this.svc.getAlertConfig(id); }

  @Post('contract/update/alert') @ApiOperation({ summary: 'Update contract alert' })
  updateAlert(@Body() b: { id: string; config: object }, @CurrentUser() a: RequestUser) { return this.svc.updateAlertConfig(b.id, b.config, a); }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('contract/dashboard/byStatus') @ApiOperation({ summary: 'Contract count by status' })
  dashByStatus(@TenantId() t: string) { return this.svc.dashboardByStatus(t); }

  @Get('contract/dashboard/byStatusV2') @ApiOperation({ summary: 'Contract count by status v2' })
  dashByStatusV2(@TenantId() t: string) { return this.svc.dashboardByStatus(t); }

  @Get('contract/dashboard/pipeline') @ApiOperation({ summary: 'Contract pipeline dashboard' })
  dashPipeline(@TenantId() t: string, @Query('pipelineId') pid?: string) { return this.svc.dashboardPipeline(t, pid); }

  @Get('contract/dashboard/pipeline/detail') @ApiOperation({ summary: 'Contract pipeline dashboard detail' })
  dashPipelineDetail(@TenantId() t: string, @Query('pipelineId') pid?: string) { return this.svc.dashboardPipeline(t, pid); }

  @Get('contract/dashboard/notInTime/pipeline') @ApiOperation({ summary: 'Contract not in time by pipeline' })
  dashNotInTime(@TenantId() t: string) { return this.svc.dashboardByStatus(t); }

  @Get('contract/dashboard/notInTime/pipeline/detail') @ApiOperation({ summary: 'Contract not in time detail' })
  dashNotInTimeDetail(@TenantId() t: string) { return this.svc.dashboardByStatus(t); }

  @Get('contract/dashboard/newByTime') @ApiOperation({ summary: 'New contracts by time' })
  dashNewByTime(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.dashboardNewByTime(t, q); }

  @Get('contract/dashboard/newByTimeV2') @ApiOperation({ summary: 'New contracts by time v2' })
  dashNewByTimeV2(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.dashboardNewByTime(t, q); }

  @Get('contract/dashboard/dealValueByCustomer') @ApiOperation({ summary: 'Deal value by customer' })
  dashDealValue(@TenantId() t: string) { return this.svc.dashboardDealValue(t); }

  @Get('contract/revenue/dashboard') @ApiOperation({ summary: 'Revenue dashboard' })
  dashRevenue(@TenantId() t: string) { return this.svc.getRevenueByDashboard(t); }

  @Get('contract/revenue/dashboard/detail') @ApiOperation({ summary: 'Revenue dashboard detail' })
  dashRevenueDetail(@TenantId() t: string) { return this.svc.getRevenueByDashboard(t); }

  @Get('contract/total/dashboard') @ApiOperation({ summary: 'Total contract dashboard' })
  dashTotal(@TenantId() t: string) { return this.svc.getTotalDashboard(t); }

  @Get('contract/report') @ApiOperation({ summary: 'Contract report' })
  report(@TenantId() t: string) { return this.svc.getReport(t); }

  @Get('contract/report/detail') @ApiOperation({ summary: 'Contract report detail' })
  reportDetail(@TenantId() t: string) { return this.svc.getReport(t); }

  // ── Export/Import ─────────────────────────────────────────────────────────

  @Get('contract/export/attributes') @ApiOperation({ summary: 'Get contract export attributes' })
  exportAttributes() { return this.svc.getExportAttributes(); }

  @Post('contract/export/randomContracts') @ApiOperation({ summary: 'Export random contracts' })
  exportRandom(@Body() b: Record<string, unknown>) { return this.svc.exportRandomContracts(b); }

  @Get('contract/import') @ApiOperation({ summary: 'Download import template' })
  importTemplate() { return this.svc.getImportTemplate(); }

  @Post('contract/import/autoProcess') @ApiOperation({ summary: 'Auto process import' })
  autoImport(@Body() b: Record<string, unknown>) { return this.svc.autoProcessImport(b); }

  @Get('contract/logValues') @ApiOperation({ summary: 'Get contract field change logs' })
  logValues(@Query('id') id: string) { return this.svc.getLogValues(id); }

  @Get('contract/placeholder') @ApiOperation({ summary: 'Get contract template placeholders' })
  placeholder(@TenantId() t: string) { return this.svc.getPlaceholder(t); }

  @Get('contract/products/select') @ApiOperation({ summary: 'Select products for contract' })
  productsSelect(@TenantId() t: string) { return this.svc.getProductsSelect(t); }

  @Get('contract/suppliers/select') @ApiOperation({ summary: 'Select suppliers for contract' })
  suppliersSelect(@TenantId() t: string) { return this.svc.getSuppliersSelect(t); }

  // ── ContractPipeline ──────────────────────────────────────────────────────

  @Get('contractPipeline/list') @ApiOperation({ summary: 'List contract pipelines' })
  listPipelines(@TenantId() t: string) { return this.svc.listPipelines(t); }

  @Post('contractPipeline/update') @ApiOperation({ summary: 'Upsert contract pipeline' })
  upsertPipeline(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertPipeline(b, a); }

  @Delete('contractPipeline/delete') @ApiOperation({ summary: 'Delete contract pipeline' })
  deletePipeline(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deletePipeline(id, a); }

  // ── ContractStage ─────────────────────────────────────────────────────────

  @Get('contractStage/list') @ApiOperation({ summary: 'List contract stages' })
  listStages(@TenantId() t: string, @Query('pipelineId') pid?: string) { return this.svc.listStages(t, pid); }

  @Post('contractStage/update') @ApiOperation({ summary: 'Upsert contract stage' })
  upsertStage(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertStage(b, a); }

  @Delete('contractStage/delete') @ApiOperation({ summary: 'Delete contract stage' })
  deleteStage(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteStage(id, a); }

  // ── ContractActivity ──────────────────────────────────────────────────────

  @Get('contractActivity/list') @ApiOperation({ summary: 'List contract activities' })
  listActivities(@TenantId() t: string, @Query('contractId') contractId: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listActivities(contractId, t, Number(p ?? 1), Number(l ?? 20)); }

  @Post('contractActivity/update') @ApiOperation({ summary: 'Add contract activity' })
  upsertActivity(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertActivity(b, a); }

  @Delete('contractActivity/delete') @ApiOperation({ summary: 'Delete contract activity' })
  deleteActivity(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteActivity(id, a); }

  // ── ContractAppendix ──────────────────────────────────────────────────────

  @Get('contractAppendix/list') @ApiOperation({ summary: 'List contract appendices' })
  listAppendices(@Query('contractId') contractId: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listAppendices(contractId, Number(p ?? 1), Number(l ?? 20)); }

  @Get('contractAppendix/get') @ApiOperation({ summary: 'Get contract appendix' })
  getAppendix(@Query('id') id: string) { return this.svc.getAppendix(id); }

  @Post('contractAppendix/update') @ApiOperation({ summary: 'Upsert contract appendix' })
  upsertAppendix(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertAppendix(b, a); }

  @Delete('contractAppendix/delete') @ApiOperation({ summary: 'Delete contract appendix' })
  deleteAppendix(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteAppendix(id, a); }

  // ── ContractPayment ───────────────────────────────────────────────────────

  @Get('contractPayment/list') @ApiOperation({ summary: 'List contract payments' })
  listPayments(@Query('contractId') contractId: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listPayments(contractId, Number(p ?? 1), Number(l ?? 20)); }

  @Post('contractPayment/update') @ApiOperation({ summary: 'Upsert contract payment' })
  upsertPayment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertPayment(b, a); }

  @Delete('contractPayment/delete') @ApiOperation({ summary: 'Delete contract payment' })
  deletePayment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deletePayment(id, a); }

  // ── ContractExchange ──────────────────────────────────────────────────────

  @Get('contractExchange/list') @ApiOperation({ summary: 'List contract exchanges' })
  listExchanges(@Query('contractId') contractId: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listExchanges(contractId, Number(p ?? 1), Number(l ?? 20)); }

  @Post('contractExchange/update') @ApiOperation({ summary: 'Add contract exchange' })
  addExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addExchange(b, a); }

  @Delete('contractExchange/delete') @ApiOperation({ summary: 'Delete contract exchange' })
  deleteExchange(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteExchange(id, a); }

  // ── ContractAlert ─────────────────────────────────────────────────────────

  @Get('contractAlert/list') @ApiOperation({ summary: 'List contracts with expiring alerts' })
  listAlerts(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) {
    const page = Number(p ?? 1), limit = Number(l ?? 20);
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.svc.list(t, { expiryDateLte: future.toISOString() }, page, limit);
  }

  @Post('contractAlert/update') @ApiOperation({ summary: 'Update contract alert (via alert endpoint)' })
  updateAlertViaAlert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateAlertConfig(b.id as string, b, a); }

  // ── ContractApproach ──────────────────────────────────────────────────────

  @Get('contractApproach/list') @ApiOperation({ summary: 'List contract approaches' })
  listApproach(@Query('contractId') contractId: string) { return this.svc.listActivities(contractId, '', 1, 50); }

  @Get('contractApproach/get') @ApiOperation({ summary: 'Get contract approach' })
  getApproach(@Query('id') id: string) { return this.svc.getAppendix(id); }

  @Post('contractApproach/update') @ApiOperation({ summary: 'Upsert contract approach' })
  upsertApproach(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertActivity(b, a); }

  @Delete('contractApproach/delete') @ApiOperation({ summary: 'Delete contract approach' })
  deleteApproach(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteActivity(id, a); }

  @Post('contract/update/approach') @ApiOperation({ summary: 'Update contract approach' })
  updateApproach(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertActivity(b, a); }
}
