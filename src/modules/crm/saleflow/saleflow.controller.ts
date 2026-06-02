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

  @Post('saleflowActivity/update') addActivity(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addActivity(b, a); }
  @Delete('saleflowActivity/delete') deleteActivity(@Query('id') id: string) { return this.svc.deleteActivity(id); }

  @Post('saleflowApproach/update') addApproach(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addActivity(b, a); }
  @Delete('saleflowApproach/delete') deleteApproach(@Query('id') id: string) { return this.svc.deleteActivity(id); }

  @Post('saleflowExchange/update') addExchange(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addExchange(b, a); }
  @Delete('saleflowExchange/delete') deleteExchange(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteExchange(id, a); }

  @Get('saleflowSale/list') listSales(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('saleflowInvoice/list') listInvoices(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Post('saleflowInvoice/update') upsertInvoice(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Post('saleflowEform/update') upsertEform(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
}
