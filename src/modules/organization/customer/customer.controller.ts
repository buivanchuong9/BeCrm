import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('customer')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  // ── Customers ─────────────────────────────────────────────────────────────

  @Get('customer/list')
  @ApiOperation({ summary: 'List customers (MSW compat path)' })
  listMsw(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.list(tenantId, query);
  }

  @Get('customer/list_paid')
  @ApiOperation({ summary: 'List customers' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.list(tenantId, query);
  }

  @Get('customer/list_paid/shared')
  @ApiOperation({ summary: 'List customers (shared/quick search)' })
  listShared(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.listShared(tenantId, {
      name: query.name ?? query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('customer/list_by_id')
  @ApiOperation({ summary: 'Get multiple customers by IDs' })
  listByIds(
    @TenantId() tenantId: string,
    @Query('lstId') lstId: string,
    @Query('ids') ids: string,
  ) {
    const raw = lstId ?? ids ?? '';
    return this.customerService.listByIds(tenantId, raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);
  }

  @Get('customer/get')
  @ApiOperation({ summary: 'Get customer by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getById(id, tenantId);
  }

  @Get('customer/get/phone')
  @ApiOperation({ summary: 'Get customer phone (masked)' })
  getPhone(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getPhone(id, tenantId);
  }

  @Get('customer/get/phones')
  @ApiOperation({ summary: 'Get customer full phones' })
  getPhones(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getPhone(id, tenantId);
  }

  @Get('customer/get/email')
  @ApiOperation({ summary: 'Get customer email' })
  getEmail(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getEmail(id, tenantId);
  }

  @Post('customer/update')
  @ApiOperation({ summary: 'Create or update customer' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.upsert(body as Parameters<CustomerService['upsert']>[0], actor);
  }

  @Delete('customer/delete')
  @ApiOperation({ summary: 'Delete customer (single)' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.delete(id, actor);
  }

  @Post('customer/delete')
  @ApiOperation({ summary: 'Delete customers (batch)' })
  deleteAll(@Body() body: { ids: string[] }, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteAll(body.ids, actor);
  }

  @Post('customer/update/byField')
  @ApiOperation({ summary: 'Update customer by single field' })
  updateByField(
    @Body() body: { id: string; field: string; value: unknown },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.updateByField(body.id, body.field, body.value, actor);
  }

  @Post('customer/update_batch/customer_group')
  @ApiOperation({ summary: 'Batch update customer group' })
  updateBatchGroup(
    @Body() body: { ids: string[]; customerGroupId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.updateBatchGroup(body.ids, body.customerGroupId, actor);
  }

  @Post('customer/update_batch/customer_source')
  @ApiOperation({ summary: 'Batch update customer source' })
  updateBatchSource(
    @Body() body: { ids: string[]; customerSourceId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.updateBatchSource(body.ids, body.customerSourceId, actor);
  }

  @Post('customer/update_batch/employee')
  @ApiOperation({ summary: 'Batch update customer employee' })
  updateBatchEmployee(
    @Body() body: { ids: string[]; iamEmployeeId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.updateBatchEmployee(body.ids, body.iamEmployeeId, actor);
  }

  @Post('customer/update/relationship')
  @ApiOperation({ summary: 'Update one customer relationship' })
  updateRelationship(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.updateRelationship(
      { customerId: body.customerId as string, relatedId: body.relatedId as string, relationshipType: body.relationshipType as string },
      actor,
    );
  }

  @Post('customer/update_batch/relationship')
  @ApiOperation({ summary: 'Batch update customer relationships' })
  updateBatchRelationship(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.updateBatchRelationship(
      body.customerIds as string[],
      body.relatedId as string,
      body.relationshipType as string,
      actor,
    );
  }

  @Post('customer/link_user')
  @ApiOperation({ summary: 'Link customer to user' })
  linkUser(@Body() body: { customerId: string; iamUserId: string }, @CurrentUser() actor: RequestUser) {
    return this.customerService.linkUser(body.customerId, body.iamUserId, actor);
  }

  @Post('customer/checkInProcess')
  @ApiOperation({ summary: 'Check customer in-process records' })
  checkInProcess(@Body('customerId') customerId: string) {
    return this.customerService.checkInProcess(customerId);
  }

  // ── Customer SMS/Email/Zalo ───────────────────────────────────────────────

  @Get('customer/send/sms/parser')
  @ApiOperation({ summary: 'Get SMS message parser for customer' })
  getSmsParser(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getSmsParser(id, tenantId);
  }

  @Get('customer/send/sms')
  @ApiOperation({ summary: 'Get SMS info for customer' })
  getSmsInfo(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getSmsParser(id, tenantId);
  }

  @Post('customer/send/sms')
  @ApiOperation({ summary: 'Send SMS to customer' })
  sendSms(@Body() body: Record<string, unknown>) {
    return this.customerService.sendSms(body);
  }

  @Get('customer/send/email/parser')
  @ApiOperation({ summary: 'Get email parser for customer' })
  getEmailParser(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getEmailParser(id, tenantId);
  }

  @Post('customer/send/email')
  @ApiOperation({ summary: 'Send email to customer' })
  sendEmail(@Body() body: Record<string, unknown>) {
    return this.customerService.sendEmail(body);
  }

  @Get('customer/send/zalo/parser')
  @ApiOperation({ summary: 'Get Zalo parser for customer' })
  getZaloParser(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getZaloParser(id, tenantId);
  }

  @Post('customer/send/zalo')
  @ApiOperation({ summary: 'Send Zalo message to customer' })
  sendZalo(@Body() body: Record<string, unknown>) {
    return this.customerService.sendZalo(body);
  }

  // ── Customer Import ───────────────────────────────────────────────────────

  @Get('customer/import')
  @ApiOperation({ summary: 'Download customer import template' })
  getImportTemplate() {
    return this.customerService.getImportTemplate();
  }

  @Post('customer/import/autoProcess')
  @ApiOperation({ summary: 'Auto process customer import file' })
  autoProcessImport(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.autoProcessImport(body, actor);
  }

  // ── Customer Reports ──────────────────────────────────────────────────────

  @Get('customerReport/summaryAction')
  @ApiOperation({ summary: 'Customer summary report' })
  getReport(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.getReport(tenantId, query);
  }

  @Get('customerReport/summaryAction/detail')
  @ApiOperation({ summary: 'Customer report detail' })
  getReportDetail(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.getReportDetail(tenantId, query);
  }

  // ── Customer Opportunities ────────────────────────────────────────────────

  @Get('opportunity/list')
  @ApiOperation({ summary: 'List opportunities for a customer' })
  listOpportunities(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerService.listOpportunities(tenantId, customerId, Number(page ?? 1), Number(limit ?? 20));
  }

  // ── Customer Schedulers ───────────────────────────────────────────────────

  @Get('customerScheduler/list')
  @ApiOperation({ summary: 'List customer schedulers' })
  listSchedulers(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.listSchedulers(tenantId, {
      customerId: query.customerId,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('customerScheduler/get')
  @ApiOperation({ summary: 'Get customer scheduler detail' })
  getScheduler(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.customerService.getScheduler(id, tenantId);
  }

  @Post('customerScheduler/update')
  @ApiOperation({ summary: 'Create or update customer scheduler' })
  upsertScheduler(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.upsertScheduler(body, actor);
  }

  @Post('customerScheduler/cancel')
  @ApiOperation({ summary: 'Cancel customer scheduler' })
  cancelScheduler(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.cancelScheduler(id, actor);
  }

  // ── Customer Exchanges ────────────────────────────────────────────────────

  @Get('customerExchange/list')
  @ApiOperation({ summary: 'List customer exchanges' })
  listExchanges(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerService.listExchanges(tenantId, customerId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('customerExchange/update')
  @ApiOperation({ summary: 'Add customer exchange' })
  addExchange(
    @Body() body: { customerId: string; exchangeType?: string; content?: string; contentDelta?: object; mediaUrls?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.addExchange(body, actor);
  }

  @Delete('customerExchange/delete')
  @ApiOperation({ summary: 'Delete customer exchange' })
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteExchange(id, actor);
  }

  // ── Customer Viewers ──────────────────────────────────────────────────────

  @Get('customerViewer/list')
  @ApiOperation({ summary: 'List customer viewers' })
  listViewers(@TenantId() tenantId: string, @Query('customerId') customerId: string) {
    return this.customerService.listViewers(tenantId, customerId);
  }

  @Post('customerViewer/update')
  @ApiOperation({ summary: 'Add customer viewer' })
  addViewer(
    @Body() body: { customerId: string; iamUserId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.addViewer(body.customerId, body.iamUserId, actor);
  }

  @Delete('customerViewer/delete')
  @ApiOperation({ summary: 'Remove customer viewer' })
  deleteViewer(@Query('id') id: string) {
    return this.customerService.deleteViewer(id);
  }

  // ── Telesale Calls ────────────────────────────────────────────────────────

  @Get('telesaleCall/list')
  @ApiOperation({ summary: 'List telesale calls' })
  listTelesaleCalls(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.customerService.listTelesaleCalls(tenantId, {
      customerId: query.customerId,
      iamEmployeeId: query.iamEmployeeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('telesaleCall/update')
  @ApiOperation({ summary: 'Create or update telesale call' })
  upsertTelesaleCall(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.upsertTelesaleCall(body, actor);
  }

  // ── Customer Fields ───────────────────────────────────────────────────────

  @Get('customerField/list')
  @ApiOperation({ summary: 'List customer custom fields' })
  listFields(@TenantId() tenantId: string) {
    return this.customerService.listFields(tenantId);
  }

  @Post('customerField/update')
  @ApiOperation({ summary: 'Create or update customer field' })
  upsertField(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.upsertField(body, actor);
  }

  @Delete('customerField/delete')
  @ApiOperation({ summary: 'Delete customer field' })
  deleteField(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteField(id, actor);
  }

  // ── Customer Attributes ───────────────────────────────────────────────────

  @Get('customerAttribute/list')
  @ApiOperation({ summary: 'List customer attributes' })
  listAttributes(@TenantId() tenantId: string, @Query('name') name?: string) {
    return this.customerService.listAttributes(tenantId, { name });
  }

  @Get('customerAttribute/listAll')
  listAttributesAll(@TenantId() tenantId: string) {
    return this.customerService.listAttributes(tenantId);
  }

  @Get('customerAttribute/checkDuplicated')
  @ApiOperation({ summary: 'Check if customer attribute value is duplicated' })
  checkDuplicatedAttribute(
    @TenantId() tenantId: string,
    @Query('fieldName') fieldName: string,
    @Query('value') value: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.customerService.checkDuplicatedAttribute(tenantId, fieldName, value, excludeId);
  }

  @Post('customerAttribute/update')
  @ApiOperation({ summary: 'Create or update customer attribute' })
  upsertAttribute(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.customerService.upsertAttribute(body, actor);
  }

  @Delete('customerAttribute/delete')
  @ApiOperation({ summary: 'Delete customer attribute' })
  deleteAttribute(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteAttribute(id, actor);
  }

  @Get('customerExtraInfo/list')
  @ApiOperation({ summary: 'List customer extra info values' })
  listExtraInfos(@Query('customerId') customerId: string) {
    return this.customerService.listExtraInfos(customerId);
  }

  // ── Customer Groups ───────────────────────────────────────────────────────

  @Get('customerGroup/list')
  @ApiOperation({ summary: 'List customer groups' })
  listGroups(@TenantId() tenantId: string, @Query('name') name?: string) {
    return this.customerService.listGroups(tenantId, { name });
  }

  @Post('customerGroup/update')
  @ApiOperation({ summary: 'Create or update customer group' })
  upsertGroup(
    @Body() body: { id?: string; name: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.upsertGroup(body, actor);
  }

  @Delete('customerGroup/delete')
  @ApiOperation({ summary: 'Delete customer group' })
  deleteGroup(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteGroup(id, actor);
  }

  // ── Customer Sources ──────────────────────────────────────────────────────

  @Get('customerSource/list')
  @ApiOperation({ summary: 'List customer sources' })
  listSources(@TenantId() tenantId: string, @Query('name') name?: string) {
    return this.customerService.listSources(tenantId, { name });
  }

  @Post('customerSource/update')
  @ApiOperation({ summary: 'Create or update customer source' })
  upsertSource(
    @Body() body: { id?: string; name: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.customerService.upsertSource(body, actor);
  }

  @Delete('customerSource/delete')
  @ApiOperation({ summary: 'Delete customer source' })
  deleteSource(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customerService.deleteSource(id, actor);
  }

  // ── MSW compat endpoints ──────────────────────────────────────────────────

  @Get('careAfterVisit/list')
  @ApiOperation({ summary: 'List care after visit records (MSW compat)' })
  listCareAfterVisit(
    @TenantId() tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerService.listCareAfterVisit(tenantId, customerId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('customer/medical_record')
  @ApiOperation({ summary: 'Get customer medical record' })
  getMedicalRecord(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('id') id: string,
  ) {
    return this.customerService.getMedicalRecord(tenantId, customerId ?? id);
  }
}
