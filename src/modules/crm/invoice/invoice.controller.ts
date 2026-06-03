import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('invoice')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class InvoiceController {
  constructor(private svc: InvoiceService) {}

  // Core CRUD
  @Get('invoice/list') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('invoice/list/v2') listV2(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('invoice/get') get(@Query('id') id: string) { return this.svc.getById(id); }
  @Post('invoice/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Post('invoice/create') create(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('invoice/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Post('invoiceDetail/update') upsertDetail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertDetail(b, a); }
  @Post('invoiceDetail/import') importDetail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertDetail(b, a); }
  @Post('invoiceDetail/cardService') upsertCardSvc(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertDetail(b, a); }
  @Post('invoiceDetail/customer') upsertCustomerDetail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertDetail(b, a); }
  @Get('invoiceDetail/list') listDetail(@TenantId() t: string, @Query() q: Record<string, string>) { return { items: [], total: 0, page: 1, limit: 20 }; }
  @Delete('invoiceDetail/delete') deleteDetail(@Query('id') id: string) { return this.svc.deleteDetail(id); }
  // Stub endpoints (FE calls these but they are secondary)
  @Get('invoice/get/sales') getSales(@TenantId() t: string, @Query() q: Record<string, string>) { return { items: [] }; }
  @Get('invoice/debt') getDebt(@TenantId() t: string, @Query() q: Record<string, string>) { return { items: [], total: 0 }; }
  @Post('invoice/update/temp') saveTempInvoice(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Get('invoice/using/card') getCardUsage(@TenantId() t: string, @Query() q: Record<string, string>) { return { items: [], total: 0 }; }
  @Get('invoice/code') getInvoiceCode(@TenantId() t: string) { return { code: `INV-${Date.now()}` }; }

  // ── Dashboard report endpoints ─────────────────────────────────────────────
  @Get('invoice/employee/top')   getTopEmployee(@TenantId() t: string, @Query() q: Record<string, string>)   { return this.svc.getTop(t, 'employee', q); }
  @Get('invoice/product/top')    getTopProduct(@TenantId() t: string, @Query() q: Record<string, string>)    { return this.svc.getTop(t, 'product', q); }
  @Get('invoice/service/top')    getTopService(@TenantId() t: string, @Query() q: Record<string, string>)    { return this.svc.getTop(t, 'service', q); }
  @Get('invoice/card-service/top') getTopCardService(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.getTop(t, 'card-service', q); }
  @Get('invoice/city/top')       getTopCity(@TenantId() t: string, @Query() q: Record<string, string>)       { return this.svc.getTop(t, 'city', q); }
}
