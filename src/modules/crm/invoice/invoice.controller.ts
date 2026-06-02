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

  @Get('invoice/list') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('invoice/get') get(@Query('id') id: string) { return this.svc.getById(id); }
  @Post('invoice/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('invoice/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Post('invoiceDetail/update') upsertDetail(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertDetail(b, a); }
  @Delete('invoiceDetail/delete') deleteDetail(@Query('id') id: string) { return this.svc.deleteDetail(id); }
}
