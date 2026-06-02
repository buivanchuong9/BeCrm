import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GuaranteeService } from './guarantee.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('guarantee')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class GuaranteeController {
  constructor(private svc: GuaranteeService) {}

  @Get('guaranteeType/list') listTypes(@TenantId() t: string) { return this.svc.listTypes(t); }
  @Post('guaranteeType/update') upsertType(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertType(b, a); }
  @Delete('guaranteeType/delete') deleteType(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteType(id, a); }

  @Get('guarantee/list') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('guarantee/get') get(@Query('id') id: string) { return this.svc.getById(id); }
  @Post('guarantee/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('guarantee/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Get('guaranteeAlert/list') listAlerts(@TenantId() t: string) { return this.svc.list(t, {}, 1, 20); }
  @Post('guaranteeAlert/update') updateAlert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Get('guaranteeAttachment/list') listAttachments() { return []; }
  @Post('guaranteeAttachment/update') addAttachment(@Body() b: Record<string, unknown>) { return { message: 'Attached' }; }
  @Delete('guaranteeAttachment/delete') deleteAttachment(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('guaranteeAttribute/list') listAttributes(@TenantId() t: string) { return []; }
  @Post('guaranteeAttribute/update') upsertAttribute(@Body() b: Record<string, unknown>) { return { message: 'Saved' }; }
  @Delete('guaranteeAttribute/delete') deleteAttribute(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('guaranteeExtraInfo/list') listExtraInfos() { return []; }
  @Get('guaranteeType/list') listType2(@TenantId() t: string) { return this.svc.listTypes(t); }
}
