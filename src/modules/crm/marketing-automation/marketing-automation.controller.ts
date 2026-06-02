import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MarketingAutomationService } from './marketing-automation.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('campaign')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class MarketingAutomationController {
  constructor(private maService: MarketingAutomationService) {}

  @Get('ma/list')
  @ApiOperation({ summary: 'List marketing automations' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.maService.list(tenantId, {
      name: query.name,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('ma/get')
  @ApiOperation({ summary: 'Get marketing automation by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.maService.getById(id, tenantId);
  }

  @Post('ma/update')
  @ApiOperation({ summary: 'Create or update marketing automation' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.maService.upsert(body, actor);
  }

  @Delete('ma/delete')
  @ApiOperation({ summary: 'Delete marketing automation' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.maService.delete(id, actor);
  }

  @Post('maCustomer/insertList')
  @ApiOperation({ summary: 'Add customers to marketing automation' })
  addCustomers(
    @Body() body: { marketingAutomationId: string; customerIds: string[] },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.maService.addCustomers(body.marketingAutomationId, body.customerIds, actor);
  }

  @Get('ma/dashboard/customer/byStatus')
  @ApiOperation({ summary: 'Get MA customer stats by status' })
  getDashboardByStatus(
    @TenantId() tenantId: string,
    @Query('marketingAutomationId') marketingAutomationId: string,
  ) {
    return this.maService.getDashboardByStatus(tenantId, marketingAutomationId);
  }

  @Get('ma/detail')
  @ApiOperation({ summary: 'Get MA detail (alias)' })
  getDetail(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.maService.getById(id, tenantId);
  }

  @Post('ma/update/status')
  @ApiOperation({ summary: 'Update MA status' })
  updateStatus(@Body() body: { id: string; status: string }, @CurrentUser() actor: RequestUser) {
    return this.maService.upsert({ id: body.id, status: body.status }, actor);
  }

  @Post('ma/update-config')
  @ApiOperation({ summary: 'Update MA config' })
  updateConfig(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.maService.upsert(body, actor);
  }

  @Post('ma/config/update')
  @ApiOperation({ summary: 'Update MA node config' })
  updateNodeConfig(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.maService.upsert(body, actor);
  }

  @Get('ma/config/get')
  @ApiOperation({ summary: 'Get MA config' })
  getConfig(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.maService.getById(id, tenantId);
  }

  @Post('ma/config-node/update')
  @ApiOperation({ summary: 'Update MA config node' })
  updateConfigNode(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.maService.upsert(body, actor);
  }

  @Delete('ma/node/delete')
  @ApiOperation({ summary: 'Delete MA node' })
  deleteNode(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.maService.delete(id, actor);
  }

  @Get('ma/customer/get')
  @ApiOperation({ summary: 'Get MA customer' })
  getCustomer(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.maService.getById(id, tenantId);
  }

  @Get('ma/statistic/byDate')
  @ApiOperation({ summary: 'MA statistic by date' })
  statisticByDate(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.maService.getDashboardByStatus(tenantId, query.id ?? '');
  }

  @Get('ma/statistic/custCard')
  @ApiOperation({ summary: 'MA statistic by customer card' })
  statisticCustCard(@TenantId() tenantId: string) { return { data: [] }; }

  @Get('ma/statistic/custCareer')
  @ApiOperation({ summary: 'MA statistic by customer career' })
  statisticCustCareer(@TenantId() tenantId: string) { return { data: [] }; }

  @Get('ma/statistic/custGroup')
  @ApiOperation({ summary: 'MA statistic by customer group' })
  statisticCustGroup(@TenantId() tenantId: string) { return { data: [] }; }

  @Get('maMapping/list')
  @ApiOperation({ summary: 'List MA mappings' })
  listMaMappings(@TenantId() tenantId: string) {
    return this.maService.listMaMappings(tenantId);
  }

  @Post('maMapping/update')
  @ApiOperation({ summary: 'Update MA mapping' })
  upsertMaMapping(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.maService.upsertMaMapping(body, actor);
  }

  @Delete('maMapping/delete')
  @ApiOperation({ summary: 'Delete MA mapping' })
  deleteMaMapping(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.maService.deleteMaMapping(id, actor);
  }

  @Get('maCustomer/list')
  @ApiOperation({ summary: 'List MA customers' })
  listMaCustomers(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.maService.listMaCustomers(tenantId, query.marketingAutomationId);
  }

  @Delete('maCustomer/delete')
  @ApiOperation({ summary: 'Delete MA customer' })
  deleteMaCustomer(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.maService.deleteMaCustomer(id, actor);
  }
}
