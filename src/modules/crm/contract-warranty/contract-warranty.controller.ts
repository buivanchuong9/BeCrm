import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContractWarrantyService } from './contract-warranty.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('contract-warranty')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class ContractWarrantyController {
  constructor(private svc: ContractWarrantyService) {}

  @Get('contractWarranty/list') list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.list(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('contractWarranty/get') get(@Query('id') id: string) { return this.svc.getById(id); }
  @Post('contractWarranty/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('contractWarranty/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Get('contractWarranty/statistical') statistical(@TenantId() t: string) { return this.svc.getStatistical(t); }
  @Get('contractWarranty/placeholder') placeholder() { return this.svc.getPlaceholder(); }
  @Get('contractWarranty/export/attributes') exportAttrs() { return this.svc.getExportAttributes(); }
  @Post('contractWarranty/export/randomContractWarranty') exportRandom(@Body() b: Record<string, unknown>) { return this.svc.exportRandom(b); }
  @Post('contractWarranty/export/randomWarranty') exportWarranty(@Body() b: Record<string, unknown>) { return this.svc.exportWarranty(b); }
  @Get('contractWarranty/import') importTpl() { return this.svc.getImportTemplate(); }
  @Post('contractWarranty/import/autoProcess') autoImport(@Body() b: Record<string, unknown>) { return this.svc.autoProcessImport(b); }
}
