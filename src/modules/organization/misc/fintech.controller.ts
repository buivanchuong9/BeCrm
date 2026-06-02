/**
 * FintechController — mock/stub fintech routes for loan, deposit, service charge,
 * financial reports, and transaction information modules.
 * FE calls these via process.env.APP_API_URL (same server on port 1912).
 */
import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MiscService } from './misc.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('fintech')
@ApiBearerAuth('JWT')
@Controller()
export class FintechController {
  constructor(private svc: MiscService) {}

  // ── Brief Financial Report ────────────────────────────────────────────────
  @Get('briefFinancialReport/list') listBFR(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('briefFinancialReport', t, q); }
  @Get('briefFinancialReport/get') getBFR(@Query('id') id: string) { return this.svc.getById('briefFinancialReport', id); }
  @Post('briefFinancialReport/update') upsertBFR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('briefFinancialReport', b, a); }
  @Delete('briefFinancialReport/delete') deleteBFR(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('briefFinancialReport', id, a); }

  // ── Full Financial Report ─────────────────────────────────────────────────
  @Get('fullFinancialReport/list') listFFR(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('fullFinancialReport', t, q); }
  @Get('fullFinancialReport/get') getFFR(@Query('id') id: string) { return this.svc.getById('fullFinancialReport', id); }
  @Post('fullFinancialReport/update') upsertFFR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('fullFinancialReport', b, a); }
  @Delete('fullFinancialReport/delete') deleteFFR(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('fullFinancialReport', id, a); }

  // ── Loan Information ──────────────────────────────────────────────────────
  @Get('loanInformation/list') listLoan(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('loanInformation', t, q); }
  @Get('loanInformation/get') getLoan(@Query('id') id: string) { return this.svc.getById('loanInformation', id); }
  @Post('loanInformation/update') upsertLoan(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('loanInformation', b, a); }
  @Delete('loanInformation/delete') deleteLoan(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('loanInformation', id, a); }

  // ── Net Deposit ───────────────────────────────────────────────────────────
  @Get('netDeposit/list') listDeposit(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('netDeposit', t, q); }
  @Get('netDeposit/get') getDeposit(@Query('id') id: string) { return this.svc.getById('netDeposit', id); }
  @Post('netDeposit/update') upsertDeposit(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('netDeposit', b, a); }
  @Delete('netDeposit/delete') deleteDeposit(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('netDeposit', id, a); }

  // ── Net Loan ──────────────────────────────────────────────────────────────
  @Get('netLoan/list') listNetLoan(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('netLoan', t, q); }
  @Get('netLoan/get') getNetLoan(@Query('id') id: string) { return this.svc.getById('netLoan', id); }
  @Post('netLoan/update') upsertNetLoan(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('netLoan', b, a); }
  @Delete('netLoan/delete') deleteNetLoan(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('netLoan', id, a); }

  // ── Net Service Charge ────────────────────────────────────────────────────
  @Get('netServiceCharge/list') listNSC(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('netServiceCharge', t, q); }
  @Get('netServiceCharge/get') getNSC(@Query('id') id: string) { return this.svc.getById('netServiceCharge', id); }
  @Post('netServiceCharge/update') upsertNSC(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('netServiceCharge', b, a); }
  @Delete('netServiceCharge/delete') deleteNSC(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('netServiceCharge', id, a); }

  // ── Product Demand ────────────────────────────────────────────────────────
  @Get('productDemand/list') listPD(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('productDemand', t, q); }
  @Get('productDemand/get') getPD(@Query('id') id: string) { return this.svc.getById('productDemand', id); }
  @Post('productDemand/update') upsertPD(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('productDemand', b, a); }
  @Delete('productDemand/delete') deletePD(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('productDemand', id, a); }

  // ── Transaction Information ───────────────────────────────────────────────
  @Get('transactionInformation/list') listTI(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('transactionInformation', t, q); }
  @Get('transactionInformation/get') getTI(@Query('id') id: string) { return this.svc.getById('transactionInformation', id); }
  @Post('transactionInformation/update') upsertTI(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('transactionInformation', b, a); }
  @Delete('transactionInformation/delete') deleteTI(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('transactionInformation', id, a); }

  // ── Package / OrgApp ──────────────────────────────────────────────────────
  @Get('api/package/list') listPackage(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('package', t, q); }
  @Get('api/package/get') getPackage(@Query('id') id: string) { return this.svc.getById('package', id); }
  @Post('api/package/update') upsertPackage(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert('package', b, a); }
  @Post('api/package/update/status') updatePackageStatus(@Body() b: Record<string, unknown>) { return b; }
  @Delete('api/package/delete') deletePackage(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete('package', id, a); }
  @Post('api/orgApp/add') addOrgApp(@Body() b: Record<string, unknown>) { return b; }
  @Post('api/orgApp/update/bill') updateOrgAppBill(@Body() b: Record<string, unknown>) { return b; }
  @Post('api/orgApp/calc/priceRemaining') calcOrgAppPrice(@Body() b: Record<string, unknown>) { return { price: 0 }; }
  @Post('api/orgApp/extend') extendOrgApp(@Body() b: Record<string, unknown>) { return { extended: true }; }
  @Post('api/orgApp/upgrade') upgradeOrgApp(@Body() b: Record<string, unknown>) { return { upgraded: true }; }

  // ── Card Service (public API) ─────────────────────────────────────────────
  @Get('api/cardService/list') listCardServicePublic(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('cardService', t, q); }
  @Get('api/product/list') listProductApi(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('product', t, q); }
  @Get('api/service/list') listServiceApi(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list('service', t, q); }
}
