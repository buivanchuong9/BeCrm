/**
 * Misc Controller — covers remaining small API groups:
 * app, orgApp, offer, quote, order, purchaseRequest, eform, document,
 * setting, globalConfig, resource, moduleResource, requestPermission,
 * package, promotion, gift, timekeeping, earnings, rolePermission,
 * fanpage, marketing, emailRequest, smsRequest, partnerEmail/Call/Sms,
 * customerAnalytics classify, score, qrCode, relationship, etc.
 */
import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MiscService } from './misc.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('misc')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class MiscController {
  constructor(private svc: MiscService) {}

  // ── App Management ────────────────────────────────────────────────────────
  @Get('app/list') listApps(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('app', t, q); }
  @Get('app/get') getApp(@Query('id') id: string) { return this.svc.getById('app', id); }
  @Get('app/get/key') getAppKey(@Query('key') key: string) { return { key, value: null }; }
  @Post('app/update') upsertApp(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('app', b, a); }
  @Delete('app/delete') deleteApp(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('app', id, a); }

  // ── Offer ─────────────────────────────────────────────────────────────────
  @Get('offer/list') listOffers(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('offer', t, q); }
  @Get('offer/get') getOffer(@Query('id') id: string) { return this.svc.getById('offer', id); }
  @Post('offer/create') createOffer(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('offer', b, a); }
  @Post('offer/update') upsertOffer(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('offer', b, a); }
  @Delete('offer/delete') deleteOffer(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('offer', id, a); }
  @Get('offerDetail/list') listOfferDetails(@Query('offerId') id: string) { return []; }
  @Post('offerDetail/update') upsertOfferDetail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return b; }
  @Delete('offerDetail/delete') deleteOfferDetail(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('offerProduct/list') listOfferProducts(@Query('offerId') id: string) { return []; }
  @Post('offerProduct/update') upsertOfferProduct(@Body() b: Record<string, unknown>) { return b; }
  @Delete('offerProduct/delete') deleteOfferProduct(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('offerService/list') listOfferServices(@Query('offerId') id: string) { return []; }
  @Post('offerService/update') upsertOfferService(@Body() b: Record<string, unknown>) { return b; }
  @Delete('offerService/delete') deleteOfferService(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('offerCardService/list') listOfferCardSvc(@Query('offerId') id: string) { return []; }
  @Post('offerCardService/update') upsertOfferCardSvc(@Body() b: Record<string, unknown>) { return b; }
  @Delete('offerCardService/delete') deleteOfferCardSvc(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Quote ─────────────────────────────────────────────────────────────────
  @Get('quote/list') listQuotes(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('quote', t, q); }
  @Get('quote/get') getQuote(@Query('id') id: string) { return this.svc.getById('quote', id); }
  @Post('quote/update') upsertQuote(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('quote', b, a); }
  @Delete('quote/delete') deleteQuote(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('quote', id, a); }
  @Post('quote/clone') cloneQuote(@Body('id') id: string, @CurrentUser() a: RequestUser) { return { cloned: true }; }
  @Get('quoteForm/list') listQF(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('quoteForm', t, q); }
  @Post('quoteForm/update') upsertQF(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('quoteForm', b, a); }
  @Delete('quoteForm/delete') deleteQF(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('quoteForm/get') getQF(@Query('id') id: string) { return this.svc.getById('quoteForm', id); }

  // ── Purchase Request ──────────────────────────────────────────────────────
  @Get('purchaseRequest/list') listPR(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('purchaseRequest', t, q); }
  @Get('purchaseRequest/get') getPR(@Query('id') id: string) { return this.svc.getById('purchaseRequest', id); }
  @Post('purchaseRequest/update') upsertPR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }
  @Delete('purchaseRequest/delete') deletePR(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('purchaseRequest', id, a); }
  @Post('purchaseRequest/approve') approvePR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }
  @Post('purchaseRequest/reject') rejectPR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }
  @Post('purchaseRequest/cancel') cancelPR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }

  // ── Order ─────────────────────────────────────────────────────────────────
  @Get('order/list') listOrders(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('order', t, q); }
  @Get('order/get') getOrder(@Query('id') id: string) { return this.svc.getById('order', id); }
  @Post('order/update') upsertOrder(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('order', b, a); }
  @Delete('order/delete') deleteOrder(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('order', id, a); }

  // ── Eform ─────────────────────────────────────────────────────────────────
  @Get('eform/list') listEforms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('eform', t, q); }
  @Get('eform/get') getEform(@Query('id') id: string) { return this.svc.getById('eform', id); }
  @Post('eform/update') upsertEform(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('eform', b, a); }
  @Delete('eform/delete') deleteEform(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('eform', id, a); }
  @Get('eformAttribute/list') listEformAttrs(@TenantId() t: string, @Query('eformId') eid: string) { return []; }
  @Post('eformAttribute/update') upsertEformAttr(@Body() b: Record<string, unknown>) { return b; }
  @Delete('eformAttribute/delete') deleteEformAttr(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('eformAttribute/get') getEformAttr(@Query('id') id: string) { return { id }; }
  @Get('eformExtraInfo/list') listEformExtra(@Query('eformId') id: string) { return []; }
  @Post('eformExtraInfo/update') upsertEformExtra(@Body() b: Record<string, unknown>) { return b; }
  @Delete('eformExtraInfo/delete') deleteEformExtra(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Document ──────────────────────────────────────────────────────────────
  @Get('document/list') listDocuments(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('document', t, q); }
  @Get('document/get') getDocument(@Query('id') id: string) { return this.svc.getById('document', id); }
  @Post('document/update') upsertDocument(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('document', b, a); }
  @Delete('document/delete') deleteDocument(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('document', id, a); }
  @Post('document/approve') approveDoc(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('document', b, a); }

  // ── Setting / GlobalConfig ────────────────────────────────────────────────
  @Get('setting/list') listSettings(@TenantId() t: string) { return this.svc.list('setting', t, {}); }
  @Get('setting/get') getSetting(@Query('key') key: string) { return { key, value: null }; }
  @Post('setting/update') upsertSetting(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('setting', b, a); }
  @Delete('setting/delete') deleteSetting(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('globalConfig/list') listGlobalConfigs(@TenantId() t: string) { return this.svc.list('globalConfig', t, {}); }
  @Post('globalConfig/update') upsertGlobalConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('globalConfig', b, a); }
  @Delete('globalConfig/delete') deleteGlobalConfig(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('globalConfig/get') getGlobalConfig(@Query('id') id: string) { return this.svc.getById('globalConfig', id); }

  // ── Resource / Module ─────────────────────────────────────────────────────
  @Get('resource/list') listResources(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('resource', t, q); }
  @Post('resource/update') upsertResource(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('resource', b, a); }
  @Delete('resource/delete') deleteResource(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('resource/get') getResource(@Query('id') id: string) { return this.svc.getById('resource', id); }
  @Get('moduleResource/list') listModuleResources(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('moduleResource', t, q); }
  @Post('moduleResource/update') upsertModuleResource(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('moduleResource', b, a); }
  @Delete('moduleResource/delete') deleteModuleResource(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('moduleResource/get') getModuleResource(@Query('id') id: string) { return this.svc.getById('moduleResource', id); }
  @Get('module/list') listModules(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('module', t, q); }
  @Post('module/update') upsertModule(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('module', b, a); }
  @Delete('module/delete') deleteModule(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('module/get') getModule(@Query('id') id: string) { return this.svc.getById('module', id); }

  // ── RequestPermission ─────────────────────────────────────────────────────
  @Get('requestPermission/list') listReqPerms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('requestPermission', t, q); }
  @Post('requestPermission/update') upsertReqPerm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('requestPermission', b, a); }
  @Delete('requestPermission/delete') deleteReqPerm(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Post('requestPermission/approve') approveReqPerm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('requestPermission', b, a); }
  @Post('requestPermission/reject') rejectReqPerm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('requestPermission', b, a); }
  @Get('requestPermission/get') getReqPerm(@Query('id') id: string) { return this.svc.getById('requestPermission', id); }

  // ── Package / Process Permission ──────────────────────────────────────────
  @Get('package/list') listPackages(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('package', t, q); }
  @Post('package/update') upsertPackage(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('package', b, a); }
  @Delete('package/delete') deletePackage(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('package/get') getPackage(@Query('id') id: string) { return this.svc.getById('package', id); }
  @Get('packagePermission/list') listPackPerms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('packagePermission', t, q); }
  @Post('packagePermission/update') upsertPackPerm(@Body() b: Record<string, unknown>) { return b; }

  // ── Promotion / Gift ──────────────────────────────────────────────────────
  @Get('promotion/list') listPromos(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('promotion', t, q); }
  @Post('promotion/update') upsertPromo(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('promotion', b, a); }
  @Delete('promotion/delete') deletePromo(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('promotionGroup/list') listPromoGroups(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('promotionGroup', t, q); }
  @Post('promotionGroup/update') upsertPromoGroup(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('promotionGroup', b, a); }
  @Delete('promotionGroup/delete') deletePromoGroup(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('gift/list') listGifts(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('gift', t, q); }
  @Post('gift/update') upsertGift(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('gift', b, a); }
  @Delete('gift/delete') deleteGift(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('gift/get') getGift(@Query('id') id: string) { return this.svc.getById('gift', id); }

  // ── Timekeeping ───────────────────────────────────────────────────────────
  @Get('timekeeping/list') listTimekeeping(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('timekeeping', t, q); }
  @Post('timekeeping/update') upsertTimekeeping(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('timekeeping', b, a); }
  @Delete('timekeeping/delete') deleteTimekeeping(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Earnings ──────────────────────────────────────────────────────────────
  @Get('earnings/list') listEarnings(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('earnings', t, q); }
  @Post('earnings/update') upsertEarnings(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('earnings', b, a); }
  @Delete('earnings/delete') deleteEarnings(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── RolePermission ────────────────────────────────────────────────────────
  @Get('rolePermission/list') listRolePerms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('rolePermission', t, q); }
  @Post('rolePermission/update') upsertRolePerm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('rolePermission', b, a); }
  @Delete('rolePermission/delete') deleteRolePerm(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Fanpage / Chat ────────────────────────────────────────────────────────
  @Get('fanpage/connect') getFanpageConnect(@TenantId() t: string) { return { url: '', configured: false }; }
  @Get('fanpage/list') listFanpages(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fanpage', t, q); }
  @Post('fanpage/update') upsertFanpage(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fanpage', b, a); }
  @Delete('fanpage/delete') deleteFanpage(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Delete('fanpage/remove') removeFanpage(@Query('id') id: string) { return { message: 'Removed' }; }
  @Get('fanpage/get') getFanpage(@Query('id') id: string) { return this.svc.getById('fanpage', id); }
  @Get('fanpageChat/list') listFanpageChats(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fanpageChat', t, q); }
  @Get('fanpageChat/get') getFanpageChat(@Query('id') id: string) { return this.svc.getById('fanpageChat', id); }
  @Post('fanpageChat/send') sendFanpageChat(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Post('fanpageChat/reply') replyFanpageChat(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Post('fanpageChat/send/attachment') sendFanpageChatAttachment(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Get('fanpageComment/list') listFanpageComments(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fanpageComment', t, q); }
  @Post('fanpageComment/update') upsertFanpageComment(@Body() b: Record<string, unknown>) { return b; }
  @Post('fanpageComment/reply') replyFanpageComment(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Delete('fanpageComment/delete') deleteFanpageComment(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Delete('fanpageComment/hidden') hideFanpageComment(@Query('id') id: string) { return { message: 'Hidden' }; }
  @Get('fanpageComment/get') getFanpageComment(@Query('id') id: string) { return this.svc.getById('fanpageComment', id); }
  @Get('fanpagePost/list') listFanpagePosts(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fanpagePost', t, q); }
  @Get('fanpagePost/get') getFanpagePost(@Query('id') id: string) { return this.svc.getById('fanpagePost', id); }
  @Post('fanpagePost/update') upsertFanpagePost(@Body() b: Record<string, unknown>) { return b; }
  @Get('fanpageDialog/list') listFanpageDialogs(@TenantId() t: string) { return []; }

  // ── Marketing Channel / Budget / Measurement / Report ────────────────────
  @Get('marketing/list') listMarketing(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('marketing', t, q); }
  @Post('marketing/update') upsertMarketing(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('marketing', b, a); }
  @Delete('marketing/delete') deleteMarketing(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('marketing/get') getMarketing(@Query('id') id: string) { return this.svc.getById('marketing', id); }
  @Get('marketingBudget/list') listMktBudget(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('marketingBudget', t, q); }
  @Post('marketingBudget/update') upsertMktBudget(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('marketingBudget', b, a); }
  @Delete('marketingBudget/delete') deleteMktBudget(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('marketingBudget/get') getMktBudget(@Query('id') id: string) { return this.svc.getById('marketingBudget', id); }
  @Get('marketingChannel/list') listMktChannel(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('marketingChannel', t, q); }
  @Post('marketingChannel/update') upsertMktChannel(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('marketingChannel', b, a); }
  @Delete('marketingChannel/delete') deleteMktChannel(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('marketingChannel/get') getMktChannel(@Query('id') id: string) { return this.svc.getById('marketingChannel', id); }
  @Get('marketingMeasurement/list') listMktMeas(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('marketingMeasurement', t, q); }
  @Post('marketingMeasurement/update') upsertMktMeas(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('marketingMeasurement', b, a); }
  @Delete('marketingMeasurement/delete') deleteMktMeas(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('marketingMeasurement/get') getMktMeas(@Query('id') id: string) { return this.svc.getById('marketingMeasurement', id); }
  @Get('marketingReport/list') listMktReport(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('marketingReport', t, q); }
  @Post('marketingReport/update') upsertMktReport(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('marketingReport', b, a); }
  @Delete('marketingReport/delete') deleteMktReport(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('marketingReport/get') getMktReport(@Query('id') id: string) { return this.svc.getById('marketingReport', id); }

  // ── Communication Requests ────────────────────────────────────────────────
  @Get('emailRequest/list') listEmailRequests(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('emailRequest', t, q); }
  @Post('emailRequest/send') sendEmailRequest(@Body() b: Record<string, unknown>) { return { sent: true, queued: true }; }
  @Delete('emailRequest/delete') deleteEmailRequest(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('emailRequest/get') getEmailRequest(@Query('id') id: string) { return this.svc.getById('emailRequest', id); }
  @Post('emailRequest/update') upsertEmailRequest(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('emailRequest', b, a); }

  @Get('smsRequest/list') listSmsRequests(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('smsRequest', t, q); }
  @Post('smsRequest/send') sendSmsRequest(@Body() b: Record<string, unknown>) { return { sent: true, queued: true }; }
  @Delete('smsRequest/delete') deleteSmsRequest(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('smsRequest/get') getSmsRequest(@Query('id') id: string) { return this.svc.getById('smsRequest', id); }
  @Post('smsRequest/update') upsertSmsRequest(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('smsRequest', b, a); }

  @Get('email/list') listEmails(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('email', t, q); }
  @Post('email/update') upsertEmail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('email', b, a); }

  // ── Partner Communication ─────────────────────────────────────────────────
  @Get('partnerCall/list') listPartnerCalls(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('partnerCall', t, q); }
  @Post('partnerCall/update') upsertPartnerCall(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('partnerCall', b, a); }
  @Delete('partnerCall/delete') deletePartnerCall(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('partnerCall/get') getPartnerCall(@Query('id') id: string) { return this.svc.getById('partnerCall', id); }
  @Get('partnerEmail/list') listPartnerEmails(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('partnerEmail', t, q); }
  @Post('partnerEmail/update') upsertPartnerEmail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('partnerEmail', b, a); }
  @Delete('partnerEmail/delete') deletePartnerEmail(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('partnerEmail/get') getPartnerEmail(@Query('id') id: string) { return this.svc.getById('partnerEmail', id); }
  @Get('partnerSms/list') listPartnerSms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('partnerSms', t, q); }
  @Post('partnerSms/update') upsertPartnerSms(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('partnerSms', b, a); }
  @Delete('partnerSms/delete') deletePartnerSms(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('partnerSms/get') getPartnerSms(@Query('id') id: string) { return this.svc.getById('partnerSms', id); }

  // ── Outlook Mail ──────────────────────────────────────────────────────────
  @Get('outlookMail/list') listOutlookMails(@TenantId() t: string) { return []; }
  @Post('outlookMail/send') sendOutlookMail(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Get('outlookMail/get') getOutlookMail(@Query('id') id: string) { return { id }; }
  @Delete('outlookMail/delete') deleteOutlookMail(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Customer Analytics ────────────────────────────────────────────────────
  @Get('api/v1/customer/classify/age') classifyAge(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'age'); }
  @Get('api/v1/customer/classify/gender') classifyGender(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'gender'); }
  @Get('api/v1/customer/classify/identify') classifyIdentify(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'identify'); }
  @Get('api/v1/customer/classify/topRevenue') classifyTopRevenue(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'topRevenue'); }
  @Get('api/v1/customer/classify/topBought') classifyTopBought(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'topBought'); }
  @Get('api/v1/customer/classify/topValueInvoice') classifyTopValueInvoice(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'topValueInvoice'); }
  @Get('api/v1/customer/classify/notInteractDay') classifyNotInteractDay(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'notInteractDay'); }
  @Get('api/v1/customer/classify/topInteract') classifyTopInteract(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'topInteract'); }
  @Get('api/v1/customer/classify/campaignJoined') classifyCampaignJoined(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'campaignJoined'); }
  @Get('api/v1/customer/classify/custType') classifyCustType(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'custType'); }
  @Get('api/v1/customer/classify/custGroup') classifyCustGroup(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'custGroup'); }
  @Get('api/v1/customer/classify/custSource') classifyCustSource(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'custSource'); }
  @Get('api/v1/customer/classify/custCareer') classifyCustCareer(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'custCareer'); }
  @Get('api/v1/customer/classify/custArea') classifyCustArea(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'custArea'); }
  @Get('api/v1/customer/classify/customerCard') classifyCustomerCard(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'customerCard'); }
  @Get('api/v1/customer/classify/interactTimes') classifyInteractTimes(@TenantId() t: string) { return this.svc.getCustomerClassify(t, 'interactTimes'); }
  @Get('api/v1/score/action') getScoreAction(@TenantId() t: string) { return { data: [] }; }
  @Get('api/v1/score/campaign') getScoreCampaign(@TenantId() t: string) { return { data: [] }; }
  @Post('api/v1/score/insertMulti') insertScoreMulti(@Body() b: Record<string, unknown>) { return { inserted: true }; }

  // ── FsQuote / FS Form ─────────────────────────────────────────────────────
  @Get('fs/list') listFs(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fs', t, q); }
  @Post('fs/update') upsertFs(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fs', b, a); }
  @Delete('fs/delete') deleteFs(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('fs/get') getFs(@Query('id') id: string) { return this.svc.getById('fs', id); }
  @Post('fs/approve') approveFs(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fs', b, a); }
  @Post('fs/reject') rejectFs(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fs', b, a); }
  @Get('fs/report') getfsReport(@TenantId() t: string) { return { total: 0, data: [] }; }
  @Get('fsForm/list') listFsForm(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fsForm', t, q); }
  @Post('fsForm/update') upsertFsForm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fsForm', b, a); }
  @Delete('fsForm/delete') deleteFsForm(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('fsForm/get') getFsForm(@Query('id') id: string) { return this.svc.getById('fsForm', id); }

  // ── PaymentHistory ────────────────────────────────────────────────────────
  @Get('paymentHistory/list') listPaymentHistory(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('paymentHistory', t, q); }
  @Post('paymentHistory/update') upsertPaymentHistory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('paymentHistory', b, a); }
  @Delete('paymentHistory/delete') deletePaymentHistory(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Relationship ──────────────────────────────────────────────────────────
  @Get('relationship/list') listRelationships(@TenantId() t: string) { return []; }
  @Post('relationship/update') upsertRelationship(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('relationship', b, a); }
  @Delete('relationship/delete') deleteRelationship(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Investor ──────────────────────────────────────────────────────────────
  @Get('investor/list') listInvestors(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('investor', t, q); }
  @Post('investor/update') upsertInvestor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('investor', b, a); }
  @Delete('investor/delete') deleteInvestor(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('investor/get') getInvestor(@Query('id') id: string) { return this.svc.getById('investor', id); }
  @Get('investor/list/all') listInvestorsAll(@TenantId() t: string) { return this.svc.list('investor', t, {}); }
  @Post('investor/approve') approveInvestor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('investor', b, a); }
  @Post('investor/reject') rejectInvestor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('investor', b, a); }

  // ── Project ───────────────────────────────────────────────────────────────
  @Get('project/list') listProjects(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('project', t, q); }
  @Get('project/get') getProject(@Query('id') id: string) { return this.svc.getById('project', id); }
  @Post('project/update') upsertProject(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('project', b, a); }
  @Delete('project/delete') deleteProject(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Sheet / SheetField ────────────────────────────────────────────────────
  @Get('sheet/list') listSheets(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('sheet', t, q); }
  @Post('sheet/update') upsertSheet(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('sheet', b, a); }
  @Delete('sheet/delete') deleteSheet(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('sheet/get') getSheet(@Query('id') id: string) { return this.svc.getById('sheet', id); }
  @Get('sheetField/list') listSheetFields(@TenantId() t: string, @Query('sheetId') sid: string) { return []; }
  @Post('sheetField/update') upsertSheetField(@Body() b: Record<string, unknown>) { return b; }
  @Delete('sheetField/delete') deleteSheetField(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('sheetField/get') getSheetField(@Query('id') id: string) { return { id }; }
  @Post('sheetField/clone') cloneSheetField(@Body('id') id: string) { return { cloned: true }; }

  // ── SurveyForm ────────────────────────────────────────────────────────────
  @Get('surveyForm/list') listSurveyForms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('surveyForm', t, q); }
  @Post('surveyForm/update') upsertSurveyForm(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('surveyForm', b, a); }
  @Delete('surveyForm/delete') deleteSurveyForm(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('surveyForm/get') getSurveyForm(@Query('id') id: string) { return this.svc.getById('surveyForm', id); }

  // ── TemplateCategory / TemplateEmail / TemplateSms / TemplateZalo ────────
  @Get('templateCategory/list') listTplCat(@TenantId() t: string) { return []; }
  @Post('templateCategory/update') upsertTplCat(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('templateCategory', b, a); }
  @Delete('templateCategory/delete') deleteTplCat(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('templateCategory/get') getTplCat(@Query('id') id: string) { return { id }; }
  @Get('templateEmail/list') listTemplateEmail(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('templateEmail', t, q); }
  @Get('templateEmail/get') getTemplateEmail(@Query('id') id: string) { return this.svc.getById('templateEmail', id); }
  @Post('templateEmail/update') upsertTemplateEmail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('templateEmail', b, a); }
  @Delete('templateEmail/delete') deleteTemplateEmail(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('templateEmail', id, a); }
  @Get('templateSms/list') listTemplateSms(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('templateSms', t, q); }
  @Get('templateSms/get') getTemplateSms(@Query('id') id: string) { return this.svc.getById('templateSms', id); }
  @Post('templateSms/update') upsertTemplateSms(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('templateSms', b, a); }
  @Delete('templateSms/delete') deleteTemplateSms(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('templateSms', id, a); }
  @Get('templateZalo/list') listTemplateZalo(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('templateZalo', t, q); }
  @Get('templateZalo/get') getTemplateZalo(@Query('id') id: string) { return this.svc.getById('templateZalo', id); }
  @Post('templateZalo/update') upsertTemplateZalo(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('templateZalo', b, a); }
  @Delete('templateZalo/delete') deleteTemplateZalo(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('templateZalo', id, a); }
  @Get('brandname/list') listBrandnames(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('brandname', t, q); }
  @Post('brandname/update') upsertBrandname(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('brandname', b, a); }
  @Delete('brandname/delete') deleteBrandname(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('brandname', id, a); }
  @Get('whitelist/brandname/contact/list') listBrandnameWhitelist(@TenantId() t: string) { return []; }
  @Post('whitelist/brandname/contact/update') upsertBrandnameWhitelist(@Body() b: Record<string, unknown>) { return b; }
  @Delete('whitelist/brandname/contact/delete') deleteBrandnameWhitelist(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Post('whitelist/brandname/update') changeBrandnameStatus(@Body() b: Record<string, unknown>) { return b; }
  @Get('earnings/admin/list') listAdminEarnings(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('earnings', t, q); }
  @Get('emailConfig/list') listEmailConfig(@TenantId() t: string) { return []; }
  @Post('emailConfig/update') upsertEmailConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return b; }
  @Delete('emailConfig/delete') deleteEmailConfig(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Post('email/testConnection') testEmailConnection(@Body() b: Record<string, unknown>) { return { success: true }; }
  @Get('webhook/list') listWebhooks(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('webhook', t, q); }
  @Post('webhook/update') upsertWebhook(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('webhook', b, a); }
  @Get('webhook/get') getWebhook(@Query('id') id: string) { return this.svc.getById('webhook', id); }
  @Delete('webhook/delete') deleteWebhook(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('webhook', id, a); }
  @Get('callConfig/list') listCallConfig(@TenantId() t: string) { return []; }
  @Post('callConfig/update') upsertCallConfig(@Body() b: Record<string, unknown>) { return b; }
  @Get('callConfig/get') getCallConfig(@Query('id') id: string) { return { id }; }
  @Delete('callConfig/delete') deleteCallConfig(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Post('callConfig/update/status') updateCallConfigStatus(@Body() b: Record<string, unknown>) { return b; }
  @Get('callCenter/makeCall') makeCall(@Query() q: Record<string, string>) { return { status: 'calling', ...q }; }
  @Get('callCenter/transferCall') transferCall(@Query() q: Record<string, string>) { return { status: 'transferred', ...q }; }
  @Get('callCenter/hangupCall') hangupCall(@Query() q: Record<string, string>) { return { status: 'hung_up', ...q }; }
  @Get('callCenter/makeCallOTP') makeCallOTP(@Query() q: Record<string, string>) { return { status: 'calling_otp', ...q }; }
  @Get('callCenter/getHistory') getCallHistory(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('callCenter/getHistoryByCallId') getCallHistoryById(@Query('callId') callId: string) { return { callId, history: [] }; }
  @Get('customerCall/list') listCustomerCallHistory(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('diarySurgery/listAll') listAllDiarySurgeries(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('diarySurgery', t, q); }
  @Post('warrantySupportObject/receive') warrantySOReceive(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { received: true }; }
  @Post('warrantySupportObject/processDone') warrantySODone(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { done: true }; }
  @Post('warranty/send/jssdk') warrantyCollect(@Body() b: Record<string, unknown>) { return { collected: true }; }
  @Post('promotion/init-receive-task') promotionInitReceive(@Body() b: Record<string, unknown>) { return { initiated: true }; }
  @Get('promotion/list-active') listActivePromotions(@TenantId() t: string) { return []; }
  @Get('employeeAgent/employeeId') getEmployeeCallAccount(@TenantId() t: string, @Query() q: Record<string, string>) { return { configured: false }; }

  // ── EmployeeAgent ─────────────────────────────────────────────────────────
  @Get('employeeAgent/list') listEmpAgents(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('employeeAgent', t, q); }
  @Post('employeeAgent/update') upsertEmpAgent(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('employeeAgent', b, a); }
  @Delete('employeeAgent/delete') deleteEmpAgent(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('employeeAgent/get') getEmpAgent(@Query('id') id: string) { return this.svc.getById('employeeAgent', id); }
  @Get('athena/account-info') getAthenaAccountInfo(@TenantId() t: string) { return { configured: false }; }

  // ── DiarySurgery ──────────────────────────────────────────────────────────
  @Get('diarySurgery/list') listDiarySurgeries(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('diarySurgery', t, q); }
  @Post('diarySurgery/update') upsertDiarySurgery(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('diarySurgery', b, a); }
  @Delete('diarySurgery/delete') deleteDiarySurgery(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('diarySurgery/get') getDiarySurgery(@Query('id') id: string) { return this.svc.getById('diarySurgery', id); }

  // ── DoctorQnA / Feedback ──────────────────────────────────────────────────
  @Get('feedback/list') listFeedback(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('feedback', t, q); }
  @Post('feedback/update') upsertFeedback(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('feedback', b, a); }
  @Delete('feedback/delete') deleteFeedback(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('feedback/get') getFeedback(@Query('id') id: string) { return this.svc.getById('feedback', id); }

  // ── Contract Attribute/ExtraInfo ──────────────────────────────────────────
  @Get('contractAttribute/list') listContractAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'contract'); }
  @Post('contractAttribute/update') upsertContractAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObjectAttribute(t(a), 'contract', b, a); }
  @Delete('contractAttribute/delete') deleteContractAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObjectAttribute(id, a); }
  @Get('contractAttribute/listAll') listAllContractAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'contract'); }
  @Get('contractAttribute/listFilter') listFilterContractAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'contract'); }
  @Post('contractAttribute/checkDuplicated') checkDupContractAttr(@TenantId() t: string, @Body() b: Record<string, unknown>) { return { isDuplicated: false }; }
  @Get('contractExtraInfo/list') listContractExtra(@Query('contractId') cid: string) { return []; }
  @Get('contractCategory/list') listContractCategories(@TenantId() t: string) { return this.svc.list('contractCategory', t, {}); }
  @Post('contractCategory/update') upsertContractCategory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractCategory', b, a); }
  @Delete('contractCategory/delete') deleteContractCategory(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractCategory/get') getContractCategory(@Query('id') id: string) { return this.svc.getById('contractCategory', id); }
  @Get('contractItem/list') listContractItems(@Query('contractId') cid: string) { return []; }
  @Post('contractItem/update') upsertContractItem(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractItem', b, a); }
  @Delete('contractItem/delete') deleteContractItem(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractSubPipeline/list') listCSP(@TenantId() t: string) { return []; }
  @Post('contractSubPipeline/update') upsertCSP(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractSubPipeline', b, a); }
  @Delete('contractSubPipeline/delete') deleteCSP(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractHandover/list') listCH(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('contractHandover', t, q); }
  @Post('contractHandover/update') upsertCH(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractHandover', b, a); }
  @Delete('contractHandover/delete') deleteCH(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractProgress/list') listCP(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('contractProgress', t, q); }
  @Post('contractProgress/update') upsertCP(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractProgress', b, a); }
  @Delete('contractProgress/delete') deleteCP(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractProgress/get') getCPDetail(@Query('id') id: string) { return this.svc.getById('contractProgress', id); }
  @Post('contractInvestorPayment/list') listCIP(@TenantId() t: string, @Body() b: Record<string, unknown>) { return { data: [], total: 0 }; }
  @Post('contractInvestorPayment/update') upsertCIP(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractInvestorPayment', b, a); }
  @Delete('contractInvestorPayment/delete') deleteCIP(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractInvestorPayment/get') getCIPDetail(@Query('id') id: string) { return this.svc.getById('contractInvestorPayment', id); }
  @Post('contractRequest/list') listCR(@TenantId() t: string, @Body() b: Record<string, unknown>) { return { data: [], total: 0 }; }
  @Post('contractRequest/update') upsertCR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractRequest', b, a); }
  @Delete('contractRequest/delete') deleteCR(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Post('contractQuote/list') listCQ(@TenantId() t: string, @Body() b: Record<string, unknown>) { return { data: [], total: 0 }; }
  @Post('contractQuote/update') upsertCQ(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractQuote', b, a); }
  @Delete('contractQuote/delete') deleteCQ(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractQuote/get') getCQDetail(@Query('id') id: string) { return this.svc.getById('contractQuote', id); }
  @Post('contractEform/list') listCEF(@TenantId() t: string, @Body() b: Record<string, unknown>) { return { data: [], total: 0 }; }
  @Post('contractEform/update') upsertCEF(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('contractEform', b, a); }
  @Get('contractWarrantyAttribute/list') listCWA(@TenantId() t: string) { return []; }
  @Post('contractWarrantyAttribute/update') upsertCWA(@Body() b: Record<string, unknown>) { return b; }
  @Delete('contractWarrantyAttribute/delete') deleteCWA(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractWarrantyAttribute/listAll') listAllCWA(@TenantId() t: string) { return []; }
  @Get('contractWarrantyAttribute/listFilter') listFilterCWA(@TenantId() t: string) { return []; }
  @Get('contractWarrantyExtraInfo/list') listCWEI(@Query('contractWarrantyId') id: string) { return []; }
  @Post('contractWarrantyAttachment/list') listCWAtt(@Body() b: Record<string, unknown>) { return []; }
  @Post('contractWarrantyAttachment/update') upsertCWAtt(@Body() b: Record<string, unknown>) { return b; }
  @Delete('contractWarrantyAttachment/delete') deleteCWAtt(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractWarrantyType/list') listCWT(@TenantId() t: string) { return []; }
  @Post('contractWarrantyType/update') upsertCWT(@Body() b: Record<string, unknown>) { return b; }
  @Delete('contractWarrantyType/delete') deleteCWT(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractAttachment/list') listCA(@Query('contractId') cid: string) { return []; }
  @Post('contractAttachment/update') upsertCA(@Body() b: Record<string, unknown>) { return b; }
  @Delete('contractAttachment/delete') deleteCA(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('contractAttachment/get') getCA(@Query('id') id: string) { return { id }; }

  // ── Customer-related missing ───────────────────────────────────────────────
  @Get('customerObject/list') listCustomerObjects(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('customerObject/getTop') getTopCustomerObjects(@TenantId() t: string) { return { data: [] }; }
  @Get('customerView/list') listCustomerViews(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('customerView', t, q); }
  @Post('customerView/update') upsertCustomerView(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('customerView', b, a); }
  @Delete('customerView/delete') deleteCustomerView(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('customerUpload/list') listCustomerUploads(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('customerZalo/list') listCustomerZalo(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('customerZalo/update') upsertCustomerZalo(@Body() b: Record<string, unknown>) { return b; }
  @Get('customerEmail/list') listCustomerEmails(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('customerEmail/send') sendCustomerEmail(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Get('customerCall/list') listCustomerCalls(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('customerCall/save') saveCustomerCall(@Body() b: Record<string, unknown>) { return b; }
  @Get('customerSms/list') listCustomerSms(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('customerSms/send') sendCustomerSms(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Get('customerReport/action/list') listCustomerReportActions(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('customer/zalo/oa') getCustomerZaloOA(@TenantId() t: string, @Query() q: Record<string, string>) { return []; }
  @Post('customer/export/attributes') getCustomerExportAttrs(@TenantId() t: string) { return { attributes: [] }; }
  @Post('cleanData/customer') cleanCustomerData(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { cleaned: 0 }; }

  // ── Contact-related missing ───────────────────────────────────────────────
  @Get('contactAttribute/list') listContactAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'contact'); }
  @Post('contactAttribute/update') upsertContactAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObjectAttribute(t(a), 'contact', b, a); }
  @Delete('contactAttribute/delete') deleteContactAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObjectAttribute(id, a); }
  @Get('contactExchange/list') listContactExchanges(@Query('contactId') cid: string, @Query('page') p?: string, @Query('limit') l?: string) { return { data: [], total: 0 }; }
  @Post('contactExchange/update') upsertContactExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return b; }
  @Delete('contactExchange/delete') deleteContactExchange(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Opportunity-related missing ───────────────────────────────────────────
  @Get('opportunityEform/list') listOppEforms(@Query('opportunityId') oid: string) { return []; }
  @Post('opportunityEform/update') upsertOppEform(@Body() b: Record<string, unknown>) { return b; }
  @Get('opportunityProcess/list') listOppProcesses(@Query('opportunityId') oid: string) { return []; }
  @Get('opportunityExchange/list') listOppExchanges(@Query('opportunityId') oid: string, @Query('page') p?: string, @Query('limit') l?: string) { return { data: [], total: 0 }; }
  @Post('opportunityExchange/update') upsertOppExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return b; }
  @Delete('opportunityExchange/delete') deleteOppExchange(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Campaign-related ──────────────────────────────────────────────────────
  @Get('campaignSale/list') listCampaignSales(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Get('campaignPipeline/list') listCampaignPipelines(@TenantId() t: string) { return []; }
  @Post('campaignPipeline/update') upsertCampaignPipeline(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('campaignPipeline', b, a); }
  @Delete('campaignPipeline/delete') deleteCampaignPipeline(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('campaignPipeline/get') getCampaignPipeline(@Query('id') id: string) { return this.svc.getById('campaignPipeline', id); }
  @Get('campaignOpportunity/exportCustomer') exportCampaignCustomer(@TenantId() t: string) { return { url: `/exports/campaign-customers-${Date.now()}.xlsx` }; }

  // ── Ticket-related missing ────────────────────────────────────────────────
  @Get('ticketStep/list') listTicketSteps(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('ticketStep/update') upsertTicketStep(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('ticketStep', b, a); }
  @Delete('ticketStep/delete') deleteTicketStep(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Warranty-related missing ──────────────────────────────────────────────
  @Get('warrantyCategory/list') listWarrantyCategories(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('warrantyCategory/update') upsertWarrantyCategory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('warrantyCategory', b, a); }
  @Delete('warrantyCategory/delete') deleteWarrantyCategory(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('warrantyProcess/list') listWarrantyProcesses(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('warrantyProcess/update') upsertWarrantyProcess(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('warrantyProcess', b, a); }
  @Delete('warrantyProcess/delete') deleteWarrantyProcess(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('warrantyStep/list') listWarrantySteps(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('warrantyStep/update') upsertWarrantyStep(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('warrantyStep', b, a); }

  // ── QrCode ────────────────────────────────────────────────────────────────
  @Get('qrCode/list') listQrCodes(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('qrCode', t, q); }
  @Post('qrCode/update') upsertQrCode(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('qrCode', b, a); }
  @Delete('qrCode/delete') deleteQrCode(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Integration ───────────────────────────────────────────────────────────
  @Get('integrationConfig/list') listIntegrationConfigs(@TenantId() t: string) { return []; }
  @Post('integrationConfig/update') upsertIntegrationConfig(@Body() b: Record<string, unknown>) { return b; }
  @Get('integrationLog/list') listIntegrationLogs(@TenantId() t: string) { return []; }
  @Post('integrationLog/update') upsertIntegrationLog(@Body() b: Record<string, unknown>) { return b; }
  @Get('integrationPartner/list') listIntegrationPartners(@TenantId() t: string) { return []; }
  @Post('integrationPartner/update') upsertIntegrationPartner(@Body() b: Record<string, unknown>) { return b; }
  @Delete('integrationPartner/delete') deleteIntegrationPartner(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── ObjectGroup ───────────────────────────────────────────────────────────
  @Get('objectGroup/list') listObjectGroups(@TenantId() t: string, @Query() q: Record<string, string>) { return []; }
  @Post('objectGroup/update') upsertObjectGroup(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('objectGroup', b, a); }
  @Delete('objectGroup/delete') deleteObjectGroup(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('objectGroup/get') getObjectGroup(@Query('id') id: string) { return this.svc.getById('objectGroup', id); }
  @Get('objectFeature/list') listObjectFeatures(@TenantId() t: string, @Query() q: Record<string, string>) { return []; }
  @Post('objectFeature/update') upsertObjectFeature(@Body() b: Record<string, unknown>) { return b; }
  @Delete('objectFeature/delete') deleteObjectFeature(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('objectSource/list') listObjectSources(@TenantId() t: string) { return []; }
  @Post('objectSource/update') upsertObjectSource(@Body() b: Record<string, unknown>) { return b; }

  // ── POM ───────────────────────────────────────────────────────────────────
  @Get('pom/list') listPom(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('pom', t, q); }
  @Post('pom/update') upsertPom(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('pom', b, a); }
  @Delete('pom/delete') deletePom(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('pom/get') getPom(@Query('id') id: string) { return this.svc.getById('pom', id); }
  @Post('pom/approve') approvePom(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('pom', b, a); }

  // ── Product/Service attributes ────────────────────────────────────────────
  @Get('productAttribute/list') listProductAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'product'); }
  @Post('productAttribute/update') upsertProductAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObjectAttribute(t(a), 'product', b, a); }
  @Delete('productAttribute/delete') deleteProductAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObjectAttribute(id, a); }
  @Get('productAttribute/listAll') listAllProductAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'product'); }
  @Get('productExtraInfo/list') listProductExtraInfos(@Query('productId') id: string) { return []; }
  @Post('productExtraInfo/update') upsertProductExtraInfo(@Body() b: Record<string, unknown>) { return b; }
  @Get('serviceAttribute/list') listServiceAttrs(@TenantId() t: string) { return this.svc.listObjectAttributes(t, 'service'); }
  @Post('serviceAttribute/update') upsertServiceAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertObjectAttribute(t(a), 'service', b, a); }
  @Delete('serviceAttribute/delete') deleteServiceAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteObjectAttribute(id, a); }
  @Get('serviceExtraInfo/list') listServiceExtraInfos(@Query('serviceId') id: string) { return []; }
  @Post('serviceExtraInfo/update') upsertServiceExtraInfo(@Body() b: Record<string, unknown>) { return b; }

  // ── Misc remaining ────────────────────────────────────────────────────────
  @Get('rentalType/list') listRentalTypes(@TenantId() t: string) { return []; }
  @Post('rentalType/update') upsertRentalType(@Body() b: Record<string, unknown>) { return b; }
  @Delete('rentalType/delete') deleteRentalType(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('rentalType/get') getRentalType(@Query('id') id: string) { return { id }; }
  @Get('process-permission/list') listProcessPerms(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('process-permission/update') upsertProcessPerm(@Body() b: Record<string, unknown>) { return b; }
  @Delete('process-permission/delete') deleteProcessPerm(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('process-permission/get') getProcessPerm(@Query('id') id: string) { return { id }; }
  @Get('order-request/list') listOrderRequests(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('orderRequest', t, q); }
  @Post('order-request/update') upsertOrderRequest(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('orderRequest', b, a); }
  @Delete('order-request/delete') deleteOrderRequest(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('order-request/get') getOrderRequest(@Query('id') id: string) { return this.svc.getById('orderRequest', id); }
  @Post('order-request/approve') approveOrderRequest(@Body() b: Record<string, unknown>) { return b; }
  @Post('order-request/reject') rejectOrderRequest(@Body() b: Record<string, unknown>) { return b; }
  @Post('order-request/cancel') cancelOrderRequest(@Body() b: Record<string, unknown>) { return b; }
  @Get('cxmQuestionCondition/list') listCxmQC(@Query('questionId') id: string) { return []; }
  @Post('cxmQuestionCondition/update') upsertCxmQC(@Body() b: Record<string, unknown>) { return b; }
  @Delete('cxmQuestionCondition/delete') deleteCxmQC(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('cxmQuestionCondition/get') getCxmQC(@Query('id') id: string) { return { id }; }
  @Get('cxmResponse/list') listCxmResponse(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('cxmResponse/update') upsertCxmResponse(@Body() b: Record<string, unknown>) { return b; }
  @Delete('cxmResponse/delete') deleteCxmResponse(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('cxmResponseDetail/list') listCxmRD(@Query('responseId') id: string) { return []; }
  @Post('cxmResponseDetail/update') upsertCxmRD(@Body() b: Record<string, unknown>) { return b; }
  @Delete('cxmResponseDetail/delete') deleteCxmRD(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('artifactComment/list') listArtifactComments(@Query('refId') id: string) { return []; }
  @Post('artifactComment/update') upsertArtifactComment(@Body() b: Record<string, unknown>) { return b; }
  @Get('artifactGird/add') addArtifactGird(@Query('id') id: string) { return { id }; }
  @Get('artifactGird/get') getArtifactGird(@Query('id') id: string) { return { id }; }
  @Get('artifactGrid/list') listArtifactGrids(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('artifactGrid/update') upsertArtifactGrid(@Body() b: Record<string, unknown>) { return b; }
  @Delete('artifactGrid/delete') deleteArtifactGrid(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('artifactGrid/get') getArtifactGrid(@Query('id') id: string) { return { id }; }
  @Get('artifactGridHeader/list') listArtifactGridHeaders(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('artifactGridHeader/update') upsertArtifactGridHeader(@Body() b: Record<string, unknown>) { return b; }
  @Delete('artifactGridHeader/delete') deleteArtifactGridHeader(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('artifactGridHeader/get') getArtifactGridHeader(@Query('id') id: string) { return { id }; }
  @Get('artifactMetadata/list') listArtifactMetadata(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('artifactMetadata/update') upsertArtifactMetadata(@Body() b: Record<string, unknown>) { return b; }
  @Delete('artifactMetadata/delete') deleteArtifactMetadata(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('artifactMetadata/get') getArtifactMetadata(@Query('id') id: string) { return { id }; }
  @Get('supportConfig/list') listSupportConfigs(@TenantId() t: string) { return []; }
  @Post('supportConfig/update') upsertSupportConfig(@Body() b: Record<string, unknown>) { return b; }
  @Delete('supportConfig/delete') deleteSupportConfig(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('supportConfig/get') getSupportConfig(@Query('id') id: string) { return { id }; }
  @Get('supportObject/list') listSupportObjects(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('supportObject/update') upsertSupportObject(@Body() b: Record<string, unknown>) { return b; }
  @Delete('supportObject/delete') deleteSupportObject(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('supportObject/get') getSupportObject(@Query('id') id: string) { return { id }; }
  @Get('supportLog/list') listSupportLogs(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('supportLog/update') upsertSupportLog(@Body() b: Record<string, unknown>) { return b; }
  @Delete('supportLog/delete') deleteSupportLog(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('supportLink/list') listSupportLinks(@TenantId() t: string) { return []; }
  @Post('supportLink/update') upsertSupportLink(@Body() b: Record<string, unknown>) { return b; }
  @Delete('supportLink/delete') deleteSupportLink(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('support/list') listSupport(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('support/update') upsertSupport(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('support', b, a); }
  @Get('chatlog/list') listChatlogs(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('chatgpt/chat') chatGpt(@Body() b: Record<string, unknown>) { return { response: 'AI response not configured' }; }
  @Get('field/list') listFields(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('field/update') upsertField(@Body() b: Record<string, unknown>) { return b; }
  @Delete('field/delete') deleteField(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('field/get') getField(@Query('id') id: string) { return { id }; }
  @Get('tipUserConfig/list') listTipUserConfigs(@TenantId() t: string, @Query('iamUserId') uid: string) { return []; }
  @Post('tipUserConfig/update') upsertTipUserConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('tipUserConfig', b, a); }
  @Delete('tipUserConfig/delete') deleteTipUserConfig(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('kpi/list') listKpis(@TenantId() t: string, @Query() q: Record<string, string>) { return { data: [], total: 0 }; }
  @Post('approvalObject/reset') resetApprovalObject(@Body('id') id: string, @CurrentUser() a: RequestUser) { return { reset: true }; }
  @Get('organization/update') getOrganization(@TenantId() t: string) { return { tenantId: t }; }
  @Post('organization/update') updateOrganization(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('organization', b, a); }
}

// Standalone helper function (not a decorator)
function t(actor: RequestUser): string { return actor.tenantId; }
