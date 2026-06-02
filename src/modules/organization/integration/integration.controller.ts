import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('integration')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class IntegrationController {
  constructor(private svc: IntegrationService) {}

  // ── ZaloOA ────────────────────────────────────────────────────────────────
  @Get('zaloOa/connect') @ApiOperation({ summary: 'Get Zalo OA OAuth connect URL' })
  connectZaloOA(@TenantId() t: string) { return { url: '', configured: false }; }

  @Get('zaloOa/list') @ApiOperation({ summary: 'List Zalo OA connections' })
  listZaloOA(@TenantId() t: string) { return this.svc.listZaloOA(t); }

  @Post('zaloOa/update') @ApiOperation({ summary: 'Upsert Zalo OA' })
  upsertZaloOA(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertZaloOA(b, a); }

  @Delete('zaloOa/delete') @ApiOperation({ summary: 'Delete Zalo OA' })
  deleteZaloOA(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteZaloOA(id, a); }

  // ── Zalo Chat & ZNS ────────────────────────────────────────────────────────
  @Get('zaloChat/list') @ApiOperation({ summary: 'List Zalo chats' })
  listZaloChats(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listZaloChats(t, q); }

  @Get('zaloChat/get') @ApiOperation({ summary: 'Get Zalo chat' })
  getZaloChat(@Query('id') id: string) { return this.svc.getZaloChat(id); }

  @Post('zaloChat/send') @ApiOperation({ summary: 'Send Zalo message' })
  sendZalo(@Body() b: Record<string, unknown>) { return this.svc.sendZaloMessage(b); }

  @Post('zaloChat/send/link_image') @ApiOperation({ summary: 'Send Zalo link image' })
  sendZaloLinkImage(@Body() b: Record<string, unknown>) { return { sent: true }; }

  @Post('zaloChat/send/file') @ApiOperation({ summary: 'Send Zalo file' })
  sendZaloFile(@Body() b: Record<string, unknown>) { return { sent: true }; }

  @Post('zaloChat/send/answer') @ApiOperation({ summary: 'Send Zalo answer' })
  sendZaloAnswer(@Body() b: Record<string, unknown>) { return { sent: true }; }

  @Delete('zaloChat/delete') @ApiOperation({ summary: 'Delete Zalo chat' })
  deleteZaloChat(@Query('id') id: string) { return { message: 'Deleted' }; }

  @Get('zaloFollower/list') @ApiOperation({ summary: 'List Zalo followers' })
  listZaloFollowers(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listZaloFollowers(t, q); }

  @Get('znsTemplate/list') @ApiOperation({ summary: 'List ZNS templates' })
  listZNSTemplates(@TenantId() t: string) { return this.svc.listZNSTemplates(t); }

  @Get('znsTemplate/list/sync') @ApiOperation({ summary: 'Sync ZNS templates' })
  syncZNSTemplates(@TenantId() t: string) { return this.svc.listZNSTemplates(t); }

  @Get('znsTemplate/get') @ApiOperation({ summary: 'Get ZNS template detail' })
  getZNSTemplate(@Query('id') id: string) { return { id }; }

  @Get('znsTemplate/refresh') @ApiOperation({ summary: 'Refresh ZNS template detail' })
  refreshZNSTemplate(@Query('id') id: string) { return { id, refreshed: true }; }

  @Post('znsTemplate/update') @ApiOperation({ summary: 'Upsert ZNS template' })
  upsertZNSTemplate(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertZNSTemplate(b, a); }

  @Delete('znsTemplate/delete') @ApiOperation({ summary: 'Delete ZNS template' })
  deleteZNSTemplate(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteZNSTemplate(id, a); }

  // ── Object Attributes ─────────────────────────────────────────────────────
  @Get('objectAttribute/list') @ApiOperation({ summary: 'List object attributes' })
  listObjectAttrs(@TenantId() t: string, @Query('objectType') objectType: string) { return this.svc.listObjectAttributes(t, objectType); }

  @Post('objectAttribute/update') @ApiOperation({ summary: 'Upsert object attribute' })
  upsertObjectAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObjectAttribute(b, a); }

  @Delete('objectAttribute/delete') @ApiOperation({ summary: 'Delete object attribute' })
  deleteObjectAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObjectAttribute(id, a); }

  @Get('objectAttribute/get') @ApiOperation({ summary: 'Get object attribute' })
  getObjectAttr(@Query('id') id: string) { return this.svc.getObjectAttribute(id); }

  @Get('objectExtraInfo/list') @ApiOperation({ summary: 'List object extra info' })
  listObjectExtraInfos(@Query('objectType') objectType: string, @Query('objectId') objectId: string) { return []; }

  @Get('objectFeature/list') @ApiOperation({ summary: 'List object features' })
  listObjectFeatures() { return []; }

  @Get('objectGroup/list') @ApiOperation({ summary: 'List object groups' })
  listObjectGroups() { return []; }

  // ── User Login Logs ───────────────────────────────────────────────────────
  @Get('userLogin/list') @ApiOperation({ summary: 'List user login logs' })
  listLoginLogs(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listLoginLogs(t, q); }

  @Get('userLogin/daily/list') @ApiOperation({ summary: 'List daily login details' })
  listDailyLoginLogs(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listLoginLogs(t, q); }

  // ── Customer Analytics ────────────────────────────────────────────────────
  @Get('customer/dashboard/list') @ApiOperation({ summary: 'Customer analytics list' })
  customerDashList(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.getCustomerAnalytics(t, 'list', q); }

  @Get('customer/dashboard/fields') @ApiOperation({ summary: 'Customer analytics fields' })
  customerDashFields(@TenantId() t: string) { return this.svc.getCustomerAnalytics(t, 'fields', {}); }

  @Get('customer/dashboard/getTotal') @ApiOperation({ summary: 'Customer analytics total' })
  customerDashTotal(@TenantId() t: string) { return this.svc.getCustomerAnalytics(t, 'total', {}); }

  @Get('customer/dashboard/getTotal/detail') @ApiOperation({ summary: 'Customer analytics total detail' })
  customerDashTotalDetail(@TenantId() t: string) { return this.svc.getCustomerAnalytics(t, 'total', {}); }

  @Get('customer/dashboard/fetchData') @ApiOperation({ summary: 'Customer analytics fetch data' })
  customerDashFetch(@TenantId() t: string) { return this.svc.getCustomerAnalytics(t, 'data', {}); }

  @Get('customer/dashboard/externalOrnot') @ApiOperation({ summary: 'Customer external/internal' })
  customerDashExternal(@TenantId() t: string) { return { external: 0, internal: 0 }; }

  @Get('customer/dashboard/get') @ApiOperation({ summary: 'Get customer dashboard' })
  customerDashGet(@TenantId() t: string) { return this.svc.getCustomerAnalytics(t, 'data', {}); }

  @Get('customer/dashboard/relationShip') @ApiOperation({ summary: 'Customer relationship dashboard' })
  customerDashRelationship(@TenantId() t: string) { return []; }

  @Post('customer/dashboard/update') @ApiOperation({ summary: 'Update customer dashboard config' })
  customerDashUpdate(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { message: 'Saved' }; }

  @Delete('customer/dashboard/delete') @ApiOperation({ summary: 'Delete customer dashboard config' })
  customerDashDelete(@Query('id') id: string) { return { message: 'Deleted' }; }

  @Post('customer/assign') @ApiOperation({ summary: 'Assign customer' })
  assignCustomer(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { assigned: true }; }

  @Post('customer/moveToEs') @ApiOperation({ summary: 'Move customer to ES' })
  moveToEs(@Body() b: Record<string, unknown>) { return { moved: true }; }

  @Get('customer/export/attributes') @ApiOperation({ summary: 'Customer export attributes' })
  customerExportAttrs(@TenantId() t: string) { return { attributes: ['name', 'phone', 'email', 'address', 'customerGroup', 'customerSource'] }; }

  @Post('customer/export/multi') @ApiOperation({ summary: 'Export customers' })
  exportCustomers(@Body() b: Record<string, unknown>) { return { url: `/exports/customers-${Date.now()}.xlsx` }; }

  @Post('customer/export/randomCustomers') @ApiOperation({ summary: 'Export random customers' })
  exportRandomCustomers(@Body() b: Record<string, unknown>) { return { url: `/exports/customers-sample-${Date.now()}.xlsx` }; }

  @Post('customer/import/manualProcess') @ApiOperation({ summary: 'Manual process customer import' })
  manualProcessImport(@Body() b: Record<string, unknown>) { return { processed: true }; }

  @Get('customer/estimate') @ApiOperation({ summary: 'Customer estimate' })
  customerEstimate(@TenantId() t: string) { return { count: 0 }; }

  @Post('customer/campaign/send/email') @ApiOperation({ summary: 'Send campaign email to customer' })
  sendCampaignEmail(@Body() b: Record<string, unknown>) { return { sent: true }; }

  // ── Reports ───────────────────────────────────────────────────────────────
  @Get('reportConfig/list') @ApiOperation({ summary: 'List report configs' })
  listReportConfigs(@TenantId() t: string) { return this.svc.listReports(t); }

  @Post('reportConfig/update') @ApiOperation({ summary: 'Upsert report config' })
  upsertReport(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertReport(b, a); }

  @Delete('reportConfig/delete') @ApiOperation({ summary: 'Delete report config' })
  deleteReport(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteReport(id, a); }

  @Get('reportDashboard/list') listReportDash(@TenantId() t: string) { return this.svc.listReports(t); }
  @Get('reportTemplate/list') listReportTpl(@TenantId() t: string) { return this.svc.listReports(t); }
  @Post('reportTemplate/update') upsertReportTpl(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertReport(b, a); }
  @Delete('reportTemplate/delete') deleteReportTpl(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteReport(id, a); }
  @Get('reportArtifact/list') listReportArtifact(@TenantId() t: string) { return []; }
  @Post('reportArtifact/update') upsertReportArtifact(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertReport(b, a); }
  @Delete('reportArtifact/delete') deleteReportArtifact(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteReport(id, a); }
  @Get('reportArtifact/list/byDashboard') listArtifactByDashboard(@Query('dashboardId') dashboardId: string) { return []; }
  @Get('reportArtifact/list/byEmployee') listArtifactByEmployee(@TenantId() t: string, @CurrentUser() a: RequestUser) { return []; }
  @Post('reportDashboard/update') upsertReportDashboard(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertReport(b, a); }
  @Delete('reportDashboard/delete') deleteReportDashboard(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteReport(id, a); }
  @Get('reportRole/list') listReportRole(@TenantId() t: string) { return []; }
  @Post('reportRole/update') upsertReportRole(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertReport(b, a); }
  @Delete('reportRole/delete') deleteReportRole(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteReport(id, a); }

  // ── Mailbox ───────────────────────────────────────────────────────────────
  @Get('mailbox/list') listMailbox(@TenantId() t: string) { return []; }
  @Get('mailboxExchange/list') listMailboxEx(@Query('mailboxId') id: string) { return []; }
  @Post('mailboxExchange/send') sendMailbox(@Body() b: Record<string, unknown>) { return { sent: true }; }

  // ── Treatment Time ────────────────────────────────────────────────────────
  @Get('treatmentTime/list') listTreatmentTimes(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentTimes(t, q); }
  @Post('treatmentTime/update') upsertTreatmentTime(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTreatmentTime(b, a); }
  @Delete('treatmentTime/delete') deleteTreatmentTime(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTreatmentTime(id, a); }
  @Get('treatmentTime/get') getTreatmentTime(@Query('id') id: string) { return this.svc.getTreatmentTime(id); }
}
