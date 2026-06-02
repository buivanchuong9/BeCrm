import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OpportunityService } from './opportunity.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('campaign')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class OpportunityController {
  constructor(private opportunityService: OpportunityService) {}

  // ── Opportunities ─────────────────────────────────────────────────────────

  @Get('campaignOpportunity/list')
  @ApiOperation({ summary: 'List campaign opportunities' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.opportunityService.list(tenantId, {
      campaignId: query.campaignId,
      status: query.status,
      customerId: query.customerId,
      contactId: query.contactId,
      iamOwnerId: query.iamOwnerId,
      iamSaleId: query.iamSaleId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('campaignOpportunity/list/view_sale')
  listViewSale(@TenantId() tenantId: string, @CurrentUser() actor: RequestUser, @Query() query: Record<string, string>) {
    return this.opportunityService.list(tenantId, {
      iamSaleId: actor.id,
      campaignId: query.campaignId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('campaignOpportunity/get')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.opportunityService.getById(id, tenantId);
  }

  @Post('campaignOpportunity/update')
  @ApiOperation({ summary: 'Create or update opportunity' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.upsert(body, actor);
  }

  @Post('campaignOpportunity/update/batch')
  @ApiOperation({ summary: 'Batch update opportunities' })
  updateBatch(
    @Body() body: { ids: string[]; fields: Record<string, unknown> },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.updateBatch(body.ids, body.fields, actor);
  }

  @Post('campaignOpportunity/change/employee')
  @ApiOperation({ summary: 'Change opportunity employee/owner' })
  changeEmployee(
    @Body() body: { id: string; iamOwnerId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.changeEmployee(body.id, body.iamOwnerId, actor);
  }

  @Post('campaignOpportunity/change/sale')
  @ApiOperation({ summary: 'Change opportunity salesperson' })
  changeSale(
    @Body() body: { id: string; iamSaleId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.changeSale(body.id, body.iamSaleId, actor);
  }

  @Delete('campaignOpportunity/delete')
  @ApiOperation({ summary: 'Delete opportunity' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.delete(id, actor);
  }

  // ── Opportunity Processes ─────────────────────────────────────────────────

  @Post('opportunityProcess/update')
  @ApiOperation({ summary: 'Add opportunity process snapshot' })
  addProcess(
    @Body() body: { opportunityId: string; campaignApproachId?: string; note?: string; percent?: number; status?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.addProcess(body, actor);
  }

  @Delete('opportunityProcess/delete')
  @ApiOperation({ summary: 'Delete opportunity process' })
  deleteProcess(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.deleteProcess(id, actor);
  }

  // ── Opportunity Exchanges ─────────────────────────────────────────────────

  @Get('opportunityExchange/list')
  @ApiOperation({ summary: 'List opportunity exchanges' })
  listExchanges(
    @Query('opportunityId') opportunityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.opportunityService.listExchanges(opportunityId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('opportunityExchange/update')
  @ApiOperation({ summary: 'Add opportunity exchange message' })
  addExchange(
    @Body() body: { opportunityId: string; content?: string; contentDelta?: string; mediaUrls?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.addExchange(body, actor);
  }

  @Delete('opportunityExchange/delete')
  @ApiOperation({ summary: 'Delete opportunity exchange' })
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.deleteExchange(id, actor);
  }

  // ── Opportunity Viewers ───────────────────────────────────────────────────

  @Get('campaignOpportunityViewer/list')
  listViewers(@Query('opportunityId') opportunityId: string) {
    return this.opportunityService.listViewers(opportunityId);
  }

  @Post('campaignOpportunityViewer/update')
  addViewer(
    @Body() body: { opportunityId: string; iamUserId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.addViewer(body, actor);
  }

  @Delete('campaignOpportunityViewer/delete')
  deleteViewer(@Query('id') id: string) {
    return this.opportunityService.deleteViewer(id);
  }

  // ── Opportunity Contacts ──────────────────────────────────────────────────

  @Get('opportunityContact/detail')
  getOpportunityContact(@Query('opportunityId') opportunityId: string) {
    return this.opportunityService.getOpportunityContact(opportunityId);
  }

  @Post('opportunityContact/update')
  upsertOpportunityContact(
    @Body() body: { opportunityId: string; contactId: string; isPrimary?: boolean },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.opportunityService.upsertOpportunityContact(body, actor);
  }

  // ── Standalone opportunity routes (FE CustomerService calls /opportunity/*) ─

  @Get('opportunity/get')
  @ApiOperation({ summary: 'Get opportunity detail (standalone)' })
  getOpp(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.opportunityService.getById(id, tenantId);
  }

  @Post('opportunity/update')
  @ApiOperation({ summary: 'Create or update opportunity (standalone)' })
  upsertOpp(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.upsert(body, actor);
  }

  @Delete('opportunity/delete')
  @ApiOperation({ summary: 'Delete opportunity (standalone)' })
  deleteOpp(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.opportunityService.delete(id, actor);
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  @Get('campaignOpportunity/statisticApproach')
  statisticApproach(@TenantId() tenantId: string, @Query('campaignId') campaignId: string) {
    return this.opportunityService.statisticApproach(tenantId, campaignId);
  }

  @Get('campaignOpportunity/statisticSale')
  statisticSale(@TenantId() tenantId: string, @Query('campaignId') campaignId: string) {
    return this.opportunityService.statisticSale(tenantId, campaignId);
  }

  @Get('campaignOpportunity/total/dashboard')
  getDashboardTotals(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.opportunityService.getDashboardTotals(tenantId, query);
  }
}
