/**
 * RootController — handles non-prefixed REST routes that the FE sends to APP_AUTHENTICATOR_URL.
 * These paths do NOT have /adminapi or /bpmapi prefix.
 * All endpoints return proper { code:0, result, message } envelopes via TransformInterceptor.
 */
import { Controller, Get, Post, Delete, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MiscService } from './misc.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('root')
@ApiBearerAuth('JWT')
@Controller()
export class RootController {
  constructor(private svc: MiscService) {}

  // ── Work Category ─────────────────────────────────────────────────────────
  @Get('workCategory/list') listWC(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('workCategory', t, q); }
  @Get('workCategory/get') getWC(@Query('id') id: string) { return this.svc.getById('workCategory', id); }
  @Post('workCategory/update') upsertWC(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('workCategory', b, a); }
  @Post('workCategory/update/active') updateWCStatus(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('workCategory', b, a); }
  @Delete('workCategory/delete') deleteWC(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('workCategory', id, a); }

  // ── Inventory ─────────────────────────────────────────────────────────────
  @Get('inventory/list') listInventory(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('inventory', t, q); }
  @Post('inventory/update') upsertInventory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('inventory', b, a); }
  @Delete('inventory/delete') deleteInventory(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('inventory', id, a); }
  @Get('inventory/import') importInventory() { return { url: '/templates/inventory-import.xlsx' }; }

  // ── Material ──────────────────────────────────────────────────────────────
  @Get('material/list') listMaterial(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('material', t, q); }
  @Get('material/get') getMaterial(@Query('id') id: string) { return this.svc.getById('material', id); }
  @Post('material/update') upsertMaterial(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('material', b, a); }
  @Post('material/update/status') updateMaterialStatus(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('material', b, a); }
  @Delete('material/delete') deleteMaterial(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('material', id, a); }
  @Post('material/upload') importMaterial(@Body() b: Record<string, unknown>) { return { imported: true }; }

  // ── Warehouse ─────────────────────────────────────────────────────────────
  @Get('warehouse/list') listWarehouse(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('warehouse', t, q); }
  @Get('warehouse/product/list') listWarehouseProducts(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('warehouseProduct', t, q); }
  @Get('warehouse/get_mfg_expired_date') getWarehouseExpiry(@TenantId() t: string) { return { data: [] }; }

  // ── Building / Floor ──────────────────────────────────────────────────────
  @Get('building/list') listBuilding(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('building', t, q); }
  @Get('building/get') getBuilding(@Query('id') id: string) { return this.svc.getById('building', id); }
  @Post('building/update') upsertBuilding(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('building', b, a); }
  @Delete('building/delete') deleteBuilding(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('building', id, a); }
  @Get('buildingFloor/list') listFloor(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('buildingFloor', t, q); }
  @Get('buildingFloor/get') getFloor(@Query('id') id: string) { return this.svc.getById('buildingFloor', id); }
  @Post('buildingFloor/update') upsertFloor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('buildingFloor', b, a); }
  @Delete('buildingFloor/delete') deleteFloor(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('buildingFloor', id, a); }

  // ── Business Category ─────────────────────────────────────────────────────
  @Get('businessCategory/list') listBizCategory(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('businessCategory', t, q); }
  @Get('businessCategory/get') getBizCategory(@Query('id') id: string) { return this.svc.getById('businessCategory', id); }
  @Post('businessCategory/update') upsertBizCategory(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('businessCategory', b, a); }
  @Post('businessCategory/update/active') updateBizCategoryStatus(@Body() b: Record<string, unknown>) { return b; }
  @Delete('businessCategory/delete') deleteBizCategory(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('businessCategory', id, a); }

  // ── Space ─────────────────────────────────────────────────────────────────
  @Get('space/list') listSpace(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('space', t, q); }
  @Get('space/get') getSpace(@Query('id') id: string) { return this.svc.getById('space', id); }
  @Post('space/update') upsertSpace(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('space', b, a); }
  @Delete('space/delete') deleteSpace(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('space', id, a); }
  @Get('spaceType/list') listSpaceType(@TenantId() t: string) { return this.svc.list('spaceType', t, {}); }
  @Get('spaceType/get') getSpaceType(@Query('id') id: string) { return this.svc.getById('spaceType', id); }
  @Post('spaceType/update') upsertSpaceType(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('spaceType', b, a); }
  @Delete('spaceType/delete') deleteSpaceType(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('spaceType', id, a); }
  @Get('spaceCustomer/list') listSpaceCustomer(@Query('spaceId') spaceId: string) { return []; }
  @Get('spaceCustomer/get') getSpaceCustomer(@Query('id') id: string) { return this.svc.getById('spaceCustomer', id); }
  @Post('spaceCustomer/update') upsertSpaceCustomer(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('spaceCustomer', b, a); }
  @Delete('spaceCustomer/delete') deleteSpaceCustomer(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('spaceCustomer', id, a); }

  // ── Vehicle ───────────────────────────────────────────────────────────────
  @Get('vehicle/list') listVehicle(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('vehicle', t, q); }
  @Get('vehicle/get') getVehicle(@Query('id') id: string) { return this.svc.getById('vehicle', id); }
  @Post('vehicle/update') upsertVehicle(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('vehicle', b, a); }
  @Delete('vehicle/delete') deleteVehicle(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('vehicle', id, a); }

  // ── Organization (Supplier) ───────────────────────────────────────────────
  @Get('organization/list') listOrg(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('supplier', t, q); }
  @Get('organization/get') getOrg(@Query('id') id: string) { return this.svc.getById('supplier', id); }
  @Post('organization/update') upsertOrg(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('supplier', b, a); }
  @Post('organization/update/active') updateOrgActive(@Body() b: Record<string, unknown>) { return b; }
  @Delete('organization/delete') deleteOrg(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('supplier', id, a); }
  @Get('contactOrg/list') listContactOrg(@Query('organizationId') id: string) { return []; }
  @Get('contactOrg/get') getContactOrg(@Query('id') id: string) { return { id }; }
  @Delete('contactOrg/delete') deleteContactOrg(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── Purchase Request ──────────────────────────────────────────────────────
  @Get('purchase-request/list') listPR(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('purchaseRequest', t, q); }
  @Get('purchase-request/get') getPR(@Query('id') id: string) { return this.svc.getById('purchaseRequest', id); }
  @Post('purchase-request/update') upsertPR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }
  @Delete('purchase-request/delete') deletePR(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('purchaseRequest', id, a); }
  @Post('purchase-request/update/status') updatePRStatus(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('purchaseRequest', b, a); }
  @Post('purchase-request/send/jssdk') collectPR(@Body() b: Record<string, unknown>) { return { collected: true }; }
  @Get('purchase-request/list-statistic') prStatisticList(@TenantId() t: string) { return { data: [] }; }
  @Get('purchase-request/statistic/status') prStatisticStatus(@TenantId() t: string) { return { data: [] }; }
  @Get('purchase-request/statistic/status/by-date') prStatisticStatusByDate(@TenantId() t: string) { return { data: [] }; }
  @Get('purchase-request/getJson') prGetJson(@Query() q: Record<string, string>) { return {}; }
  @Get('purchase-request/init-receive-task') prInitReceiveTask(@Query() q: Record<string, string>) { return { initiated: true }; }
  @Post('purchase-request/init-receive-task') prInitReceiveTaskPost(@Body() b: Record<string, unknown>) { return { initiated: true }; }
  @Post('purchase-request/updateCertificate') prUpdateCertificate(@Body() b: Record<string, unknown>) { return { updated: true }; }
  @Get('report/purchase-request/list') prReportList(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('purchaseRequest', t, q); }

  // ── Tender Package ────────────────────────────────────────────────────────
  @Get('tenderPackage/list') listTender(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('tenderPackage', t, q); }
  @Get('tenderPackage/get') getTender(@Query('id') id: string) { return this.svc.getById('tenderPackage', id); }
  @Post('tenderPackage/update') upsertTender(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('tenderPackage', b, a); }
  @Delete('tenderPackage/delete') deleteTender(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('tenderPackage', id, a); }
  @Get('tenderInvitation/list') listTenderInv(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('tenderInvitation', t, q); }
  @Get('tenderInvitation/list_contractor') listTenderContractor(@TenantId() t: string) { return []; }
  @Get('tenderInvitation/get') getTenderInv(@Query('id') id: string) { return this.svc.getById('tenderInvitation', id); }
  @Post('tenderInvitation/update') updateTenderInv(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('tenderInvitation', b, a); }
  @Post('tenderInvitation/cancel') cancelTenderInv(@Body() b: Record<string, unknown>) { return { cancelled: true }; }
  @Post('tenderInvitation/update/bidding_status') updateBiddingStatus(@Body() b: Record<string, unknown>) { return b; }
  @Post('tenderOpening/update') openBidding(@Body() b: Record<string, unknown>) { return { opened: true }; }
  @Get('submittedDocument/list') listSubmittedDoc(@Query() q: Record<string, string>) { return []; }
  @Post('documentEvaluation/updateBatch') updateDocEvalBatch(@Body() b: Record<string, unknown>) { return { updated: true }; }
  @Post('submittedDocument/submit_review/update') submitReview(@Body() b: Record<string, unknown>) { return { submitted: true }; }
  @Get('documentEvaluation/getResult') getDocEvalResult(@Query() q: Record<string, string>) { return {}; }
  @Get('documentEvaluation/getFinances') getDocEvalFinances(@Query() q: Record<string, string>) { return {}; }
  @Post('documentEvaluation/sendEvaluation') sendEvaluation(@Body() b: Record<string, unknown>) { return { sent: true }; }
  @Post('generalClarification/update') updateGenClarification(@Body() b: Record<string, unknown>) { return b; }
  @Get('generalClarification/list') listGenClarification(@Query() q: Record<string, string>) { return []; }
  @Post('extensionHistory/insert') insertExtHistory(@Body() b: Record<string, unknown>) { return b; }
  @Get('extensionHistory/list') listExtHistory(@Query() q: Record<string, string>) { return []; }
  @Get('extensionRequest/get') getExtRequest(@Query('id') id: string) { return { id }; }

  // ── Clarification ─────────────────────────────────────────────────────────
  @Get('clarificationRequest/list') listClarReq(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('clarificationRequest', t, q); }
  @Get('clarificationRequest/get') getClarReq(@Query('id') id: string) { return this.svc.getById('clarificationRequest', id); }
  @Post('clarificationRequest/update') upsertClarReq(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('clarificationRequest', b, a); }
  @Delete('clarificationRequest/delete') deleteClarReq(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('clarificationRequest', id, a); }
  @Post('clarificationRequest/assign') assignClarReq(@Body() b: Record<string, unknown>) { return { assigned: true }; }
  @Get('clarificationResponse/list') listClarResp(@Query('requestId') id: string) { return []; }
  @Get('clarificationResponse/get') getClarResp(@Query('id') id: string) { return { id }; }
  @Post('clarificationResponse/update') updateClarResp(@Body() b: Record<string, unknown>) { return b; }
  @Post('clarificationResponse/insert') insertClarResp(@Body() b: Record<string, unknown>) { return b; }

  // ── Project Catalog ───────────────────────────────────────────────────────
  @Get('projectCatalog/list') listProjectCatalog(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('projectCatalog', t, q); }
  @Get('projectCatalog/get') getProjectCatalog(@Query('id') id: string) { return this.svc.getById('projectCatalog', id); }
  @Post('projectCatalog/update') upsertProjectCatalog(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('projectCatalog', b, a); }
  @Post('projectCatalog/update/status') updateProjectCatalogStatus(@Body() b: Record<string, unknown>) { return b; }
  @Delete('projectCatalog/delete') deleteProjectCatalog(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('projectCatalog', id, a); }

  // ── Procurement ───────────────────────────────────────────────────────────
  @Get('procurementType/list') listProcurement(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('procurementType', t, q); }
  @Get('procurementType/get') getProcurement(@Query('id') id: string) { return this.svc.getById('procurementType', id); }
  @Post('procurementType/update') upsertProcurement(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('procurementType', b, a); }
  @Delete('procurementType/delete') deleteProcurement(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('procurementType', id, a); }

  // ── Work Assignment / Exchange (non-adminapi BPM paths) ──────────────────
  @Get('workInprogress/list') listWorkIP(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('workInprogress', t, q); }
  @Get('workInprogress/get') getWorkIP(@Query('id') id: string) { return this.svc.getById('workInprogress', id); }
  @Post('workInprogress/update') updateWorkIP(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('workInprogress', b, a); }
  @Get('workExchange/list') listWorkExchange(@Query('workOrderId') id: string) { return []; }
  @Get('workExchange/get') getWorkExchange(@Query('id') id: string) { return { id }; }
  @Post('workExchange/update') addWorkExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return b; }
  @Delete('workExchange/delete') deleteWorkExchange(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('workAssignment') getWorkAssignment(@Query() q: Record<string, string>) { return {}; }
  @Post('workAssignment') assignWork(@Body() b: Record<string, unknown>) { return b; }
  @Put('negotiationBidderDetail') saveNegotiationWork(@Body() b: Record<string, unknown>) { return b; }
  @Post('negotiationBidderDetail/complete') completeNegotiationWork(@Body() b: Record<string, unknown>) { return { completed: true }; }
  @Get('employee/managers') listManagers(@TenantId() t: string) { return []; }
  @Get('employee/assignees') listAssignees(@TenantId() t: string) { return []; }

  // ── Field List ────────────────────────────────────────────────────────────
  @Get('field/list') listFields(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('field', t, q); }
  @Get('field/get') getField(@Query('id') id: string) { return this.svc.getById('field', id); }
  @Post('field/update') upsertField(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('field', b, a); }
  @Post('field/update/status') updateFieldStatus(@Body() b: Record<string, unknown>) { return b; }
  @Delete('field/delete') deleteField(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('field', id, a); }

  // ── Investor ──────────────────────────────────────────────────────────────
  @Get('investor/list') listInvestors(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('investor', t, q); }
  @Get('investor/get') getInvestor(@Query('id') id: string) { return this.svc.getById('investor', id); }
  @Post('investor/update') upsertInvestor(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('investor', b, a); }
  @Post('investor/update/status') updateInvestorStatus(@Body() b: Record<string, unknown>) { return b; }
  @Delete('investor/delete') deleteInvestor(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('investor', id, a); }

  // ── Product / Service / Package (public API) ──────────────────────────────
  @Get('product/list') listProductPublic(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('product', t, q); }
  @Get('product/get/jssdk') getProductJssdk(@Query() q: Record<string, string>) { return {}; }
  @Get('product-category/list') listProductCategory(@TenantId() t: string) { return []; }

  // ── Renewal / Contract Insurance ──────────────────────────────────────────
  @Get('renewal-offer/get-information-aggregate') getRenewalInfo(@Query() q: Record<string, string>) { return {}; }
  @Post('renewalContract/initBusinessProcess') renewalContractInit(@Body() b: Record<string, unknown>) { return { initiated: true }; }
  @Get('contract-insurance/get/jssdk') getContractInsuranceJssdk(@Query() q: Record<string, string>) { return {}; }
  @Get('supportObject/reset') resetTransferVotes(@Query() q: Record<string, string>) { return { reset: true }; }

  // ── BeautySalon domain lookup ─────────────────────────────────────────────
  // FE calls: ${APP_AUTHENTICATOR_URL}/api/beautySalon/get_bydomain (capital S)
  @Get('api/beautySalon/get_bydomain')
  getBeautySalonByDomain(@Query('domain') domain: string, @TenantId() t: string) {
    return this.svc.getBeautySalonByDomain(domain ?? '', t);
  }

  // lowercase alias (docs.md compat)
  @Get('api/beautysalon/get_bydomain')
  getBeautySalonByDomainLower(@Query('domain') domain: string, @TenantId() t: string) {
    return this.svc.getBeautySalonByDomain(domain ?? '', t);
  }
}
