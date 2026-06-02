import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarrantyService } from './warranty.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@ApiTags('warranty')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class WarrantyController {
  constructor(private warrantyService: WarrantyService) {}

  @Get('warranty/list')
  @ApiOperation({ summary: 'List warranties' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.warrantyService.list(tenantId, {
      customerId: query.customerId,
      status: query.status !== undefined ? Number(query.status) : undefined,
      statusId: query.statusId,
      reasonId: query.reasonId,
      iamEmployeeId: query.iamEmployeeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('warranty/get')
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.warrantyService.getById(id, tenantId);
  }

  @Post('warranty/update')
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.upsert(body, actor);
  }

  @Post('warranty/update/status')
  updateStatus(@Body() body: { id: string; status: number }, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.updateStatus(body.id, body.status, actor);
  }

  @Delete('warranty/delete')
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.delete(id, actor);
  }

  @Get('warrantyExchange/list')
  listExchanges(@Query('warrantyId') warrantyId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.warrantyService.listExchanges(warrantyId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('warrantyExchange/update')
  addExchange(@Body() body: { warrantyId: string; content?: string; contentDelta?: string; mediaUrls?: object }, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.addExchange(body, actor);
  }

  @Delete('warrantyExchange/delete')
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.deleteExchange(id, actor);
  }

  // Categories
  @Get('warrantyCategory/list')
  listCategories(@TenantId() tenantId: string, @Query('categoryType') categoryType?: string) {
    return this.warrantyService.listCategories(tenantId, categoryType !== undefined ? Number(categoryType) : undefined);
  }

  @Post('warrantyCategory/update')
  upsertCategory(
    @Body() body: { id?: string; name: string; categoryType: number; colorHex?: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.warrantyService.upsertCategory(body, actor);
  }

  @Delete('warrantyCategory/delete')
  deleteCategory(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.deleteCategory(id, actor);
  }

  // Support objects
  @Post('warrantySupportObject/receive')
  receiveSupportObject(@Body() body: { id: string; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.receiveSupportObject(body.id, body.note, actor);
  }

  @Post('warrantySupportObject/processDone')
  processDone(@Body() body: { id: string; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.warrantyService.processDoneSupportObject(body.id, body.note, actor);
  }
}
