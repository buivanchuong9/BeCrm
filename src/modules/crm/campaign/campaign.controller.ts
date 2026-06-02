import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('campaign')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  // ── Campaigns ─────────────────────────────────────────────────────────────

  @Get('campaign/list')
  @ApiOperation({ summary: 'List campaigns' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.campaignService.list(tenantId, {
      name: query.name,
      status: query.status,
      type: query.type,
      iamOwnerId: query.iamOwnerId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('campaign/list/view_sale')
  @ApiOperation({ summary: 'List campaigns for sale view' })
  listViewSale(@TenantId() tenantId: string, @CurrentUser() actor: RequestUser, @Query() query: Record<string, string>) {
    return this.campaignService.list(tenantId, {
      iamOwnerId: actor.id,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('campaign/get')
  @ApiOperation({ summary: 'Get campaign by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.campaignService.getById(id, tenantId);
  }

  @Post('campaign/update')
  @ApiOperation({ summary: 'Create or update campaign' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.campaignService.upsert(body, actor);
  }

  @Post('campaign/update/status')
  @ApiOperation({ summary: 'Update campaign status' })
  updateStatus(
    @Body() body: { id: string; status: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.campaignService.updateStatus(body.id, body.status, actor);
  }

  @Delete('campaign/delete')
  @ApiOperation({ summary: 'Delete campaign' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.campaignService.delete(id, actor);
  }

  @Post('campaign/sla-config')
  @ApiOperation({ summary: 'Update campaign SLA config' })
  updateSlaConfig(
    @Body() body: { campaignId: string; campaignApproachId?: string; slaHours: number; escalationRule?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.campaignService.updateSlaConfig(body, actor);
  }

  @Get('campaignSale/list')
  @ApiOperation({ summary: 'List campaign sales' })
  listSales(@Query('campaignId') campaignId: string, @TenantId() tenantId: string) {
    return this.campaignService.listSales(campaignId, tenantId);
  }

  // ── Campaign Approaches ───────────────────────────────────────────────────

  @Get('campaignApproach/list')
  @ApiOperation({ summary: 'List campaign approaches' })
  listApproaches(@Query('campaignId') campaignId: string, @TenantId() tenantId: string) {
    return this.campaignService.listApproaches(campaignId, tenantId);
  }

  @Get('campaignApproach/get')
  @ApiOperation({ summary: 'Get campaign approach by ID' })
  getApproachById(@Query('id') id: string) {
    return this.campaignService.getApproachById(id);
  }

  @Post('campaignApproach/update')
  @ApiOperation({ summary: 'Create or update campaign approach' })
  upsertApproach(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.campaignService.upsertApproach(body, actor);
  }

  @Delete('campaignApproach/delete')
  @ApiOperation({ summary: 'Delete campaign approach' })
  deleteApproach(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.campaignService.deleteApproach(id, actor);
  }

  // ── Campaign Activities ───────────────────────────────────────────────────

  @Get('campaignActivity/list')
  @ApiOperation({ summary: 'List campaign activities' })
  listActivities(@Query('campaignApproachId') campaignApproachId: string) {
    return this.campaignService.listActivities(campaignApproachId);
  }

  @Post('campaignActivity/update')
  @ApiOperation({ summary: 'Create or update campaign activity' })
  upsertActivity(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.campaignService.upsertActivity(body, actor);
  }

  @Delete('campaignActivity/delete')
  @ApiOperation({ summary: 'Delete campaign activity' })
  deleteActivity(@Query('id') id: string) {
    return this.campaignService.deleteActivity(id);
  }

  // ── Marketing Sources ─────────────────────────────────────────────────────

  @Get('marketingSource/list')
  @ApiOperation({ summary: 'List marketing sources' })
  listMarketingSources(@TenantId() tenantId: string) {
    return this.campaignService.listMarketingSources(tenantId);
  }

  @Post('marketingSource/update')
  @ApiOperation({ summary: 'Create or update marketing source' })
  upsertMarketingSource(
    @Body() body: { id?: string; name: string; sourceType?: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.campaignService.upsertMarketingSource(body, actor);
  }

  @Delete('marketingSource/delete')
  @ApiOperation({ summary: 'Delete marketing source' })
  deleteMarketingSource(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.campaignService.deleteMarketingSource(id, actor);
  }
}
