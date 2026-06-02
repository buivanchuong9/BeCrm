import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogExtService } from './catalog-ext.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('catalog-ext')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class CatalogExtController {
  constructor(private svc: CatalogExtService) {}

  // ── Career ────────────────────────────────────────────────────────────────
  @Get('career/list') @ApiOperation({ summary: 'List careers' })
  listCareers(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listCareers(t, q); }

  @Post('career/update') @ApiOperation({ summary: 'Upsert career' })
  upsertCareer(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCareer(b, a); }

  @Delete('career/delete') @ApiOperation({ summary: 'Delete career' })
  deleteCareer(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCareer(id, a); }

  // ── Position ──────────────────────────────────────────────────────────────
  @Get('position/list') @ApiOperation({ summary: 'List positions' })
  listPositions(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listPositions(t, q); }

  @Post('position/update') @ApiOperation({ summary: 'Upsert position' })
  upsertPosition(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertPosition(b, a); }

  @Delete('position/delete') @ApiOperation({ summary: 'Delete position' })
  deletePosition(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deletePosition(id, a); }

  // ── Competency ────────────────────────────────────────────────────────────
  @Get('competency/list') @ApiOperation({ summary: 'List competencies' })
  listCompetencies(@TenantId() t: string) { return this.svc.listCompetencies(t); }

  @Post('competency/update') @ApiOperation({ summary: 'Upsert competency' })
  upsertCompetency(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCompetency(b, a); }

  @Delete('competency/delete') @ApiOperation({ summary: 'Delete competency' })
  deleteCompetency(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCompetency(id, a); }

  // ── Building ──────────────────────────────────────────────────────────────
  @Get('building/list') @ApiOperation({ summary: 'List buildings' })
  listBuildings(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listBuildings(t, Number(p ?? 1), Number(l ?? 20)); }

  @Post('building/update') @ApiOperation({ summary: 'Upsert building' })
  upsertBuilding(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBuilding(b, a); }

  @Delete('building/delete') @ApiOperation({ summary: 'Delete building' })
  deleteBuilding(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteBuilding(id, a); }

  @Get('buildingFloor/list') @ApiOperation({ summary: 'List building floors' })
  listFloors(@Query('buildingId') bid: string, @TenantId() t: string) { return this.svc.listFloors(bid, t); }

  @Post('buildingFloor/update') @ApiOperation({ summary: 'Upsert building floor' })
  upsertFloor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertFloor(b, a); }

  @Delete('buildingFloor/delete') @ApiOperation({ summary: 'Delete building floor' })
  deleteFloor(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteFloor(id, a); }

  // ── CodeSequence ──────────────────────────────────────────────────────────
  @Get('codeSequence/list') @ApiOperation({ summary: 'List code sequences' })
  listCodeSeq(@TenantId() t: string) { return this.svc.listCodeSequences(t); }

  @Get('codeSequence/get') @ApiOperation({ summary: 'Get code sequence by id' })
  getCodeSeq(@Query('id') id: string) { return this.svc.getCodeSequence(id); }

  @Get('codeSequence/get/entity') @ApiOperation({ summary: 'Get code sequence by entity name' })
  getCodeSeqEntity(@TenantId() t: string, @Query('entityName') entityName: string) { return this.svc.getCodeSequenceByEntity(t, entityName); }

  @Post('codeSequence/update') @ApiOperation({ summary: 'Upsert code sequence' })
  upsertCodeSeq(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCodeSequence(b, a); }

  @Delete('codeSequence/delete') @ApiOperation({ summary: 'Delete code sequence' })
  deleteCodeSeq(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCodeSequence(id, a); }

  // ── Bank ──────────────────────────────────────────────────────────────────
  @Get('bank/list') @ApiOperation({ summary: 'List banks' })
  listBanks(@TenantId() t: string) { return this.svc.listBanks(t); }

  @Post('bank/update') @ApiOperation({ summary: 'Upsert bank' })
  upsertBank(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBank(b, a); }

  @Delete('bank/delete') @ApiOperation({ summary: 'Delete bank' })
  deleteBank(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteBank(id, a); }

  // ── Category ──────────────────────────────────────────────────────────────
  @Get('category/list') @ApiOperation({ summary: 'List categories' })
  listCategories(@TenantId() t: string, @Query('type') type?: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listCategories(t, type, Number(p ?? 1), Number(l ?? 50)); }

  @Get('category/get') @ApiOperation({ summary: 'Get category detail' })
  getCategory(@Query('id') id: string) { return this.svc.getCategory(id); }

  @Post('category/update') @ApiOperation({ summary: 'Upsert category' })
  upsertCategory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCategory(b, a); }

  @Delete('category/delete') @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCategory(id, a); }

  @Get('categoryItem/list') @ApiOperation({ summary: 'List category items' })
  listCategoryItems(@TenantId() t: string, @Query('categoryId') categoryId: string) { return this.svc.listCategoryItems(categoryId, t); }

  @Get('categoryItem/get') @ApiOperation({ summary: 'Get category item' })
  getCategoryItem(@Query('id') id: string) { return this.svc.getCategoryItem(id); }

  @Post('categoryItem/update') @ApiOperation({ summary: 'Upsert category item' })
  upsertCategoryItem(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCategoryItem(b, a); }

  @Delete('categoryItem/delete') @ApiOperation({ summary: 'Delete category item' })
  deleteCategoryItem(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCategoryItem(id, a); }

  // ── Card ──────────────────────────────────────────────────────────────────
  @Get('card/list') @ApiOperation({ summary: 'List loyalty cards' })
  listCards(@TenantId() t: string) { return this.svc.listCards(t); }

  @Post('card/update') @ApiOperation({ summary: 'Upsert card' })
  upsertCard(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCard(b, a); }

  @Delete('card/delete') @ApiOperation({ summary: 'Delete card' })
  deleteCard(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCard(id, a); }

  @Get('cardService/list') @ApiOperation({ summary: 'List card service defs' })
  listCardServices(@TenantId() t: string, @Query('cardId') cardId?: string) { return this.svc.listCardServices(t, cardId); }

  @Get('cardService/get') @ApiOperation({ summary: 'Get card service' })
  getCardService(@Query('id') id: string) { return this.svc.getCardService(id); }

  @Post('cardService/update') @ApiOperation({ summary: 'Upsert card service' })
  upsertCardService(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCardService(b, a); }

  @Delete('cardService/delete') @ApiOperation({ summary: 'Delete card service' })
  deleteCardService(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCardService(id, a); }

  // ── Product ───────────────────────────────────────────────────────────────
  @Get('product/list') @ApiOperation({ summary: 'List products' })
  listProducts(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listProducts(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('product/get') @ApiOperation({ summary: 'Get product' })
  getProduct(@Query('id') id: string) { return this.svc.getProduct(id); }

  @Post('product/update') @ApiOperation({ summary: 'Upsert product' })
  upsertProduct(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertProduct(b, a); }

  @Delete('product/delete') @ApiOperation({ summary: 'Delete product' })
  deleteProduct(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteProduct(id, a); }

  // ── Service ───────────────────────────────────────────────────────────────
  @Get('service/list') @ApiOperation({ summary: 'List services' })
  listServices(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listServices(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('service/get') @ApiOperation({ summary: 'Get service' })
  getService(@Query('id') id: string) { return this.svc.getService(id); }

  @Post('service/update') @ApiOperation({ summary: 'Upsert service' })
  upsertService(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertService(b, a); }

  @Delete('service/delete') @ApiOperation({ summary: 'Delete service' })
  deleteService(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteService(id, a); }

  // ── Unit ──────────────────────────────────────────────────────────────────
  @Get('unit/list') @ApiOperation({ summary: 'List units' })
  listUnits(@TenantId() t: string) { return this.svc.listUnits(t); }

  @Post('unit/update') @ApiOperation({ summary: 'Upsert unit' })
  upsertUnit(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertUnit(b, a); }

  @Delete('unit/delete') @ApiOperation({ summary: 'Delete unit' })
  deleteUnit(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteUnit(id, a); }

  // ── Cashbook ──────────────────────────────────────────────────────────────
  @Get('cashbook/list') @ApiOperation({ summary: 'List cashbook' })
  listCashbooks(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listCashbooks(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('cashbook/get') @ApiOperation({ summary: 'Get cashbook entry' })
  getCashbook(@Query('id') id: string) { return this.svc.getCashbook(id); }

  @Post('cashbook/update') @ApiOperation({ summary: 'Upsert cashbook entry' })
  upsertCashbook(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCashbook(b, a); }

  @Delete('cashbook/delete') @ApiOperation({ summary: 'Delete cashbook entry' })
  deleteCashbook(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCashbook(id, a); }

  @Get('cashbook/report') @ApiOperation({ summary: 'Get cashbook report' })
  getCashbookReport(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.getCashbookReport(t, q); }

  @Get('cashbook/statistic') @ApiOperation({ summary: 'Get cashbook statistics' })
  getCashbookStatistic(@TenantId() t: string) { return this.svc.getCashbookStatistic(t); }

  @Get('cashbook/statistic/customer') @ApiOperation({ summary: 'Get cashbook stats by customer' })
  getCashbookStatisticCustomer(@TenantId() t: string) { return this.svc.getCashbookStatistic(t); }

  @Get('cashbook/export') @ApiOperation({ summary: 'Export cashbook' })
  exportCashbook(@TenantId() t: string) { return { message: 'Export ready', url: `/exports/cashbook-${Date.now()}.xlsx` }; }

  // ── FilterSetting ─────────────────────────────────────────────────────────
  @Get('filter-setting') @ApiOperation({ summary: 'Get active filter setting for entity' })
  getFilterSetting(@TenantId() t: string, @CurrentUser() a: RequestUser, @Query('entityType') entityType?: string) { return this.svc.listFilterSettings(t, a.id, entityType); }

  @Get('filter-setting/list') @ApiOperation({ summary: 'List filter settings' })
  listFilterSettings(@TenantId() t: string, @CurrentUser() a: RequestUser, @Query('entityType') entityType?: string) { return this.svc.listFilterSettings(t, a.id, entityType); }

  @Get('filter-setting/customers/attributes') @ApiOperation({ summary: 'Get customer attributes for filter' })
  getCustomerFilterAttributes(@TenantId() t: string) { return this.svc.getCustomerFilterAttributes(t); }

  @Post('filter-setting/update') @ApiOperation({ summary: 'Upsert filter setting' })
  upsertFilterSetting(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertFilterSetting(b, a); }

  @Delete('filter-setting/delete') @ApiOperation({ summary: 'Delete filter setting' })
  deleteFilterSetting(@Query('id') id: string) { return this.svc.deleteFilterSetting(id); }

  @Get('customerExchange/attachment/list') @ApiOperation({ summary: 'List customer exchange attachments' })
  listCustomerExchangeAttachments(@Query('customerId') customerId: string, @TenantId() t: string) {
    return this.svc.listAttachments(t, 'customerExchange', customerId);
  }

  // ── Attachment ────────────────────────────────────────────────────────────
  @Get('attachment/list') @ApiOperation({ summary: 'List attachments' })
  listAttachments(@TenantId() t: string, @Query('refType') refType: string, @Query('refId') refId: string) { return this.svc.listAttachments(t, refType, refId); }

  @Get('attachment/get') @ApiOperation({ summary: 'Get attachment' })
  getAttachment(@Query('id') id: string) { return this.svc.getAttachment(id); }

  @Post('attachment/update') @ApiOperation({ summary: 'Upload attachment' })
  upsertAttachment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertAttachment(b, a); }

  @Delete('attachment/delete') @ApiOperation({ summary: 'Delete attachment' })
  deleteAttachment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteAttachment(id, a); }

  // ── TipGroup ──────────────────────────────────────────────────────────────
  @Get('tipGroup/list') @ApiOperation({ summary: 'List tip groups' })
  listTipGroups(@TenantId() t: string) { return this.svc.listTipGroups(t); }

  @Post('tipGroup/update') @ApiOperation({ summary: 'Upsert tip group' })
  upsertTipGroup(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTipGroup(b, a); }

  @Delete('tipGroup/delete') @ApiOperation({ summary: 'Delete tip group' })
  deleteTipGroup(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTipGroup(id, a); }

  @Get('tipGroupEmployee/list') @ApiOperation({ summary: 'List tip group employees' })
  listTipGroupEmployees(@Query('tipGroupId') id: string) { return this.svc.listTipGroupEmployees(id); }

  @Post('tipGroupEmployee/update') @ApiOperation({ summary: 'Add tip group employee' })
  upsertTipGroupEmployee(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTipGroupEmployee(b, a); }

  @Delete('tipGroupEmployee/delete') @ApiOperation({ summary: 'Remove tip group employee' })
  deleteTipGroupEmployee(@Query('id') id: string) { return this.svc.deleteTipGroupEmployee(id); }

  @Get('tipGroupConfig/list') @ApiOperation({ summary: 'List tip group configs' })
  listTipGroupConfigs(@TenantId() t: string, @Query('tipGroupId') tipGroupId: string) { return this.svc.listTipGroupConfigs(tipGroupId, t); }

  @Post('tipGroupConfig/update') @ApiOperation({ summary: 'Upsert tip group config' })
  upsertTipGroupConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTipGroupConfig(b, a); }

  @Delete('tipGroupConfig/delete') @ApiOperation({ summary: 'Delete tip group config' })
  deleteTipGroupConfig(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTipGroupConfig(id, a); }

  @Get('tipUser/list') @ApiOperation({ summary: 'List tip user settings' })
  listTipUsers(@TenantId() t: string, @Query('iamUserId') uid?: string) { return this.svc.listTipUsers(t, uid); }

  @Post('tipUser/update') @ApiOperation({ summary: 'Upsert tip user setting' })
  upsertTipUser(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTipUser(b, a); }

  // ── Templates ─────────────────────────────────────────────────────────────
  @Get('templateEmail/list') @ApiOperation({ summary: 'List email templates' })
  listTemplateEmails(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listTemplateEmails(t, Number(p ?? 1), Number(l ?? 20)); }

  @Post('templateEmail/update') @ApiOperation({ summary: 'Upsert email template' })
  upsertTemplateEmail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplateEmail(b, a); }

  @Delete('templateEmail/delete') @ApiOperation({ summary: 'Delete email template' })
  deleteTemplateEmail(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplateEmail(id, a); }

  @Get('templateSms/list') @ApiOperation({ summary: 'List SMS templates' })
  listTemplateSms(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listTemplateSms(t, Number(p ?? 1), Number(l ?? 20)); }

  @Post('templateSms/update') @ApiOperation({ summary: 'Upsert SMS template' })
  upsertTemplateSms(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplateSms(b, a); }

  @Delete('templateSms/delete') @ApiOperation({ summary: 'Delete SMS template' })
  deleteTemplateSms(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplateSms(id, a); }

  @Get('templateZalo/list') @ApiOperation({ summary: 'List Zalo templates' })
  listTemplateZalo(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listTemplateZalo(t, Number(p ?? 1), Number(l ?? 20)); }

  @Post('templateZalo/update') @ApiOperation({ summary: 'Upsert Zalo template' })
  upsertTemplateZalo(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTemplateZalo(b, a); }

  @Delete('templateZalo/delete') @ApiOperation({ summary: 'Delete Zalo template' })
  deleteTemplateZalo(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTemplateZalo(id, a); }

  // ── EmailConfig ───────────────────────────────────────────────────────────
  @Get('emailConfig/list') @ApiOperation({ summary: 'List email configs' })
  listEmailConfigs(@TenantId() t: string) { return this.svc.listEmailConfigs(t); }

  @Post('emailConfig/update') @ApiOperation({ summary: 'Upsert email config' })
  upsertEmailConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertEmailConfig(b, a); }

  @Delete('emailConfig/delete') @ApiOperation({ summary: 'Delete email config' })
  deleteEmailConfig(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteEmailConfig(id, a); }

  // ── Webhook ───────────────────────────────────────────────────────────────
  @Get('webhook/list') @ApiOperation({ summary: 'List webhooks' })
  listWebhooks(@TenantId() t: string) { return this.svc.listWebhooks(t); }

  @Post('webhook/update') @ApiOperation({ summary: 'Upsert webhook' })
  upsertWebhook(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertWebhook(b, a); }

  @Delete('webhook/delete') @ApiOperation({ summary: 'Delete webhook' })
  deleteWebhook(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteWebhook(id, a); }

  // ── CallConfig ────────────────────────────────────────────────────────────
  @Get('callConfig/list') @ApiOperation({ summary: 'List call configs' })
  listCallConfigs(@TenantId() t: string) { return this.svc.listCallConfigs(t); }

  @Get('callConfig/get') @ApiOperation({ summary: 'Get call config' })
  getCallConfig(@Query('id') id: string) { return this.svc.getCallConfig(id); }

  @Post('callConfig/update') @ApiOperation({ summary: 'Upsert call config' })
  upsertCallConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCallConfig(b, a); }

  @Delete('callConfig/delete') @ApiOperation({ summary: 'Delete call config' })
  deleteCallConfig(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteCallConfig(id, a); }

  @Post('callConfig/update/status') @ApiOperation({ summary: 'Update call config status' })
  updateCallConfigStatus(@Body() b: { id: string; isActive: boolean }, @CurrentUser() a: RequestUser) { return this.svc.updateCallConfigStatus(b.id, b.isActive, a); }

  // ── CallActivity ──────────────────────────────────────────────────────────
  @Get('callActivity/get') @ApiOperation({ summary: 'Get call activity' })
  getCallActivity(@Query('id') id: string) { return this.svc.getCallActivity(id); }

  @Post('callActivity/update') @ApiOperation({ summary: 'Upsert call activity' })
  upsertCallActivity(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertCallActivity(b, a); }

  // ── Send Communication ────────────────────────────────────────────────────
  @Post('sendEmail/send') @ApiOperation({ summary: 'Send email' })
  sendEmail(@Body() b: Record<string, unknown>) { return this.svc.sendEmail(b); }

  @Post('email/send') @ApiOperation({ summary: 'Send email (alt)' })
  sendEmail2(@Body() b: Record<string, unknown>) { return this.svc.sendEmail(b); }

  @Post('smsRequest/send') @ApiOperation({ summary: 'Send SMS' })
  sendSms(@Body() b: Record<string, unknown>) { return this.svc.sendSms(b); }

  @Post('emailRequest/send') @ApiOperation({ summary: 'Send email request' })
  sendEmailReq(@Body() b: Record<string, unknown>) { return this.svc.sendEmail(b); }
}

// ── CallCenter routes (separate prefix) ──────────────────────────────────────
import { Controller as C2 } from '@nestjs/common';

@ApiTags('call-center')
@ApiBearerAuth('JWT')
@C2('adminapi')
export class CallCenterController {
  constructor(private svc: CatalogExtService) {}

  @Post('callCenter/makeCall') @ApiOperation({ summary: 'Make outbound call' })
  makeCall(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.makeCall(b, a); }

  @Post('callCenter/hangupCall') @ApiOperation({ summary: 'Hang up call' })
  hangupCall(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.hangupCall(b, a); }

  @Get('callCenter/getHistory') @ApiOperation({ summary: 'Get call history' })
  getHistory(@TenantId() t: string, @Query('customerId') cid: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.getCallHistory(cid, t, Number(p ?? 1), Number(l ?? 20)); }

  @Get('callCenter/getHistoryByCallId') @ApiOperation({ summary: 'Get call history by call ID' })
  getHistoryByCallId(@Query('callId') callId: string) { return this.svc.getCallHistoryByCallId(callId); }

  @Post('callCenter/transferCall') @ApiOperation({ summary: 'Transfer call' })
  transferCall(@Body() b: Record<string, unknown>) { return { transferred: true, data: b }; }

  @Post('callCenter/makeCallOTP') @ApiOperation({ summary: 'Make OTP call' })
  makeCallOTP(@Body() b: Record<string, unknown>) { return { sent: true, data: b }; }
}
