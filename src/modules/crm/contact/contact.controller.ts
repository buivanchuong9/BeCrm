import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('contact')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class ContactController {
  constructor(private contactService: ContactService) {}

  // ── Contacts ──────────────────────────────────────────────────────────────

  @Get('contact/list')
  @ApiOperation({ summary: 'List contacts' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.contactService.list(tenantId, {
      name: query.name,
      phone: query.phone,
      email: query.email,
      contactPipelineId: query.contactPipelineId,
      contactStatusId: query.contactStatusId,
      iamOwnerId: query.iamOwnerId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('contact/get')
  @ApiOperation({ summary: 'Get contact by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.contactService.getById(id, tenantId);
  }

  @Post('contact/update')
  @ApiOperation({ summary: 'Create or update contact' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.contactService.upsert(body, actor);
  }

  @Delete('contact/delete')
  @ApiOperation({ summary: 'Delete contact' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contactService.delete(id, actor);
  }

  @Get('contactAttribute/listFilter')
  @ApiOperation({ summary: 'Get contact attributes for filter' })
  getAttributeFilterList(@TenantId() tenantId: string) {
    return this.contactService.getAttributeFilterList(tenantId);
  }

  // ── Contact Exchanges ─────────────────────────────────────────────────────

  @Get('contactExchange/list')
  @ApiOperation({ summary: 'List contact exchanges' })
  listExchanges(
    @Query('contactId') contactId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contactService.listExchanges(contactId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('contactExchange/update')
  @ApiOperation({ summary: 'Add contact exchange' })
  addExchange(
    @Body() body: { contactId: string; content?: string; contentDelta?: string; mediaUrls?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contactService.addExchange(body, actor);
  }

  @Delete('contactExchange/delete')
  @ApiOperation({ summary: 'Delete contact exchange' })
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contactService.deleteExchange(id, actor);
  }

  // ── Contact Pipelines ─────────────────────────────────────────────────────

  @Get('contactPipeline/list')
  @ApiOperation({ summary: 'List contact pipelines' })
  listPipelines(@TenantId() tenantId: string) {
    return this.contactService.listPipelines(tenantId);
  }

  @Post('contactPipeline/update')
  @ApiOperation({ summary: 'Create or update contact pipeline' })
  upsertPipeline(
    @Body() body: { id?: string; name: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contactService.upsertPipeline(body, actor);
  }

  @Delete('contactPipeline/delete')
  @ApiOperation({ summary: 'Delete contact pipeline' })
  deletePipeline(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contactService.deletePipeline(id, actor);
  }

  // ── Contact Statuses ──────────────────────────────────────────────────────

  @Get('contactStatus/list')
  @ApiOperation({ summary: 'List contact statuses' })
  listStatuses(@TenantId() tenantId: string, @Query('contactPipelineId') pipelineId?: string) {
    return this.contactService.listStatuses(tenantId, pipelineId);
  }

  @Post('contactStatus/update')
  @ApiOperation({ summary: 'Create or update contact status' })
  upsertStatus(
    @Body() body: { id?: string; contactPipelineId: string; name: string; position?: number; colorHex?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contactService.upsertStatus(body, actor);
  }

  @Delete('contactStatus/delete')
  @ApiOperation({ summary: 'Delete contact status' })
  deleteStatus(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contactService.deleteStatus(id, actor);
  }

  // ── Contact Attributes ────────────────────────────────────────────────────

  @Get('contactAttribute/list')
  @ApiOperation({ summary: 'List contact attribute definitions' })
  listAttributes(@TenantId() tenantId: string) {
    return this.contactService.listAttributes(tenantId);
  }

  @Get('contactAttribute/listAll')
  listAttributesAll(@TenantId() tenantId: string) {
    return this.contactService.listAttributes(tenantId);
  }

  @Post('contactAttribute/update')
  @ApiOperation({ summary: 'Create or update contact attribute' })
  upsertAttribute(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.contactService.upsertAttribute(body, actor);
  }

  @Delete('contactAttribute/delete')
  @ApiOperation({ summary: 'Delete contact attribute' })
  deleteAttribute(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contactService.deleteAttribute(id, actor);
  }

  @Get('contactExtraInfo/list')
  @ApiOperation({ summary: 'List contact extra info values' })
  listExtraInfos(@Query('contactId') contactId: string) {
    return this.contactService.listExtraInfos(contactId);
  }
}
