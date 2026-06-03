import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SaleflowService } from './saleflow.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('saleflow')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class SaleflowController {
  constructor(private svc: SaleflowService) {}

  @Get('saleflow/list') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('saleflow/get') get(@Query('id') id: string, @TenantId() t: string) { return this.svc.getById(id, t); }
  @Post('saleflow/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('saleflow/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }

  // ── saleflowActivity ──────────────────────────────────────────────────────
  @Get('saleflowActivity/list') listActivities(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listActivities(t, q); }
  @Post('saleflowActivity/update') addActivity(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addActivity(b, a); }
  @Delete('saleflowActivity/delete') deleteActivity(@Query('id') id: string) { return this.svc.deleteActivity(id); }

  // ── saleflowApproach ──────────────────────────────────────────────────────
  @Get('saleflowApproach/list') listApproaches(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listApproaches(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('saleflowApproach/get') getApproach(@Query('id') id: string) { return this.svc.getApproach(id); }
  @Post('saleflowApproach/update') addApproach(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertApproach(b, a); }
  @Delete('saleflowApproach/delete') deleteApproach(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteApproach(id, a); }
  @Post('saleflowApproach/update/sla') updateApproachSla(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertApproach(b, a); }

  // ── saleflowExchange ──────────────────────────────────────────────────────
  @Get('saleflowExchange/list') listExchanges(@Query('saleflowId') id: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listExchanges(id, Number(p ?? 1), Number(l ?? 20)); }
  @Get('saleflowExchange/get') getExchange(@Query('id') id: string) { return this.svc.getExchange(id); }
  @Post('saleflowExchange/update') addExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addExchange(b, a); }
  @Delete('saleflowExchange/delete') deleteExchange(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteExchange(id, a); }

  // ── saleflowSale ──────────────────────────────────────────────────────────
  @Get('saleflowSale/list') listSales(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSales(t, q); }
  @Get('saleflowSale/get/byApproachId') getSaleByApproach(@Query('approachId') id: string) { return this.svc.getSaleByApproach(id); }
  @Post('saleflowSale/update') upsertSale(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSale(b, a); }

  // ── saleflowInvoice ───────────────────────────────────────────────────────
  @Get('saleflowInvoice/list') listInvoices(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listInvoices(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('saleflowInvoice/get') getInvoice(@Query('id') id: string) { return this.svc.getInvoice(id); }
  @Post('saleflowInvoice/update') upsertInvoice(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertInvoice(b, a); }
  @Delete('saleflowInvoice/delete') deleteInvoice(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteInvoice(id, a); }
  @Post('saleflowInvoice/update/approach') invoiceApproach(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateInvoiceStatus(b, 'approach', a); }
  @Post('saleflowInvoice/update/cancel') invoiceCancel(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateInvoiceStatus(b, 'cancelled', a); }
  @Post('saleflowInvoice/update/success') invoiceSuccess(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateInvoiceStatus(b, 'success', a); }

  // ── saleflowEform ─────────────────────────────────────────────────────────
  @Post('saleflowEform/update') upsertEform(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Get('saleflowEform/get/criteria') getEformCriteria(@Query('saleflowId') id: string) { return { items: [], saleflowId: id }; }
}
