import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessPartnerService } from './business-partner.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('business-partner')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class BusinessPartnerController {
  constructor(private svc: BusinessPartnerService) {}

  @Get('businessPartner/list_paid') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('businessPartner/get') get(@Query('id') id: string, @TenantId() t: string) { return this.svc.getById(id, t); }
  @Get('businessPartner/get/phone') getPhone(@Query('id') id: string) { return this.svc.getPhone(id); }
  @Get('businessPartner/get/email') getEmail(@Query('id') id: string) { return this.svc.getEmail(id); }
  @Post('businessPartner/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('businessPartner/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Get('businessPartner/listFilter') listFilter(@TenantId() t: string) { return this.svc.listFilter(t); }
  @Get('businessPartner/export/attributes') exportAttrs() { return this.svc.getExportAttributes(); }
  @Post('businessPartner/export/randomBusinessPartners') exportRandom(@Body() b: Record<string, unknown>) { return this.svc.exportRandom(b); }
  @Get('businessPartner/import') importTpl() { return this.svc.getImportTemplate(); }
  @Post('businessPartner/import/autoProcess') autoImport(@Body() b: Record<string, unknown>) { return this.svc.autoProcessImport(b); }

  @Get('businessPartnerAttribute/list') listAttrs(@TenantId() t: string) { return this.svc.listAttributes(t); }
  @Get('businessPartnerAttribute/listAll') listAllAttrs(@TenantId() t: string) { return this.svc.listAllAttributes(t); }
  @Post('businessPartnerAttribute/update') upsertAttr(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertAttribute(b, a); }
  @Delete('businessPartnerAttribute/delete') deleteAttr(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteAttribute(id, a); }
  @Get('businessPartnerAttribute/checkDuplicated') checkDup(@TenantId() t: string, @Query('fieldKey') fk: string) { return this.svc.checkDuplicatedAttribute(t, fk); }
  @Get('businessPartner/attributes') getAttrs(@TenantId() t: string) { return this.svc.listAllAttributes(t); }

  @Get('businessPartnerExchange/list') listEx(@Query('businessPartnerId') id: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listExchanges(id, Number(p ?? 1), Number(l ?? 20)); }
  @Post('businessPartnerExchange/update') addEx(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.addExchange(b, a); }
  @Delete('businessPartnerExchange/delete') deleteEx(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteExchange(id, a); }

  @Get('businessPartnerExtraInfo/list') listExtraInfos(@Query('businessPartnerId') id: string) { return this.svc.listExtraInfos(id); }
}
