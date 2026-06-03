import { Controller, Get, Post, Delete, Body, Query, Put } from '@nestjs/common';
import { Controller as C3 } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkService } from './work.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('work')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class WorkController {
  constructor(private workService: WorkService) {}

  // ── Work Projects ─────────────────────────────────────────────────────────

  @Get('workProject/list')
  @ApiOperation({ summary: 'List work projects' })
  listProjects(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.listProjects(tenantId, {
      keyword: query.keyword ?? query.name,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('workProject/get')
  @ApiOperation({ summary: 'Get work project detail' })
  getProject(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.workService.getProject(id, tenantId);
  }

  @Post('workProject/update')
  @ApiOperation({ summary: 'Create or update work project' })
  upsertProject(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.upsertProject(body, actor);
  }

  @Delete('workProject/delete')
  @ApiOperation({ summary: 'Delete work project' })
  deleteProject(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workService.deleteProject(id, actor);
  }

  @Get('workProject/getEmployees')
  @ApiOperation({ summary: 'Get employees of a work project' })
  getProjectEmployees(@Query('id') id: string) {
    return this.workService.getProjectEmployees(id);
  }

  // ── Work Orders ───────────────────────────────────────────────────────────

  @Get('workOrder/list')
  @ApiOperation({ summary: 'List work orders' })
  listWorkOrders(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.listWorkOrders(tenantId, {
      workProjectId: query.workProjectId,
      workTypeId: query.workTypeId,
      iamAssigneeId: query.iamAssigneeId,
      status: query.status,
      keyword: query.keyword,
      customerId: query.customerId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      pageIndex: query.pageIndex ? Number(query.pageIndex) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Post('workOrder/list')
  @ApiOperation({ summary: 'List work orders (POST)' })
  listWorkOrdersPost(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.workService.listWorkOrders(tenantId, body as Record<string, never>);
  }

  @Get('workOrder/listV2')
  @ApiOperation({ summary: 'List work orders v2' })
  listWorkOrdersV2(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.listWorkOrdersV2(tenantId, {
      workProjectId: query.workProjectId,
      workTypeId: query.workTypeId,
      iamAssigneeId: query.iamAssigneeId,
      status: query.status,
      keyword: query.keyword,
      customerId: query.customerId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      pageIndex: query.pageIndex ? Number(query.pageIndex) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Get('workOrder/groups')
  @ApiOperation({ summary: 'Get work order groups by status' })
  getWorkOrderGroups(@TenantId() tenantId: string) {
    return this.workService.getWorkOrderGroups(tenantId);
  }

  @Get('workOrder/groupsV2')
  @ApiOperation({ summary: 'Get work order groups v2' })
  getWorkOrderGroupsV2(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.getWorkOrderGroupsV2(tenantId, query);
  }

  @Get('workOrder/get')
  @ApiOperation({ summary: 'Get work order detail' })
  getWorkOrder(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.workService.getWorkOrder(id, tenantId);
  }

  @Post('workOrder/update')
  @ApiOperation({ summary: 'Create or update work order' })
  upsertWorkOrder(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.upsertWorkOrder(body, actor);
  }

  @Delete('workOrder/delete')
  @ApiOperation({ summary: 'Delete work order' })
  deleteWorkOrder(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workService.deleteWorkOrder(id, actor);
  }

  @Post('workOrder/update/status')
  @ApiOperation({ summary: 'Update work order status' })
  updateStatus(@Body() body: { id: string; status: string }, @CurrentUser() actor: RequestUser) {
    return this.workService.updateWorkOrderStatus(body.id, body.status, actor);
  }

  @Post('workOrder/update/priorityLevel')
  @ApiOperation({ summary: 'Update work order priority level' })
  updatePriority(
    @Body() body: { id: string; priorityLevel: string; priority?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderPriority(body.id, body.priorityLevel, body.priority ?? 0, actor);
  }

  @Post('workOrder/update/review')
  @ApiOperation({ summary: 'Update work order rating/review' })
  updateRating(
    @Body() body: { id: string; rating: number; ratingNote?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderRating(body.id, body.rating, body.ratingNote, actor);
  }

  @Post('workOrder/update/pause')
  @ApiOperation({ summary: 'Pause or resume work order' })
  updatePause(
    @Body() body: { id: string; isPaused: boolean },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderPause(body.id, body.isPaused, actor);
  }

  @Post('workOrder/update/employee')
  @ApiOperation({ summary: 'Update work order assignee' })
  updateEmployee(
    @Body() body: { id: string; iamAssigneeId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderEmployee(body.id, body.iamAssigneeId, actor);
  }

  @Post('workOrder/update/participant')
  @ApiOperation({ summary: 'Add participant to work order' })
  updateParticipant(
    @Body() body: { workOrderId: string; iamUserId: string; role?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderParticipant(body.workOrderId, body.iamUserId, body.role, actor);
  }

  @Post('workOrder/update/customer')
  @ApiOperation({ summary: 'Update work order customer' })
  updateCustomer(
    @Body() body: { workOrderId: string; customerId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateWorkOrderCustomer(body.workOrderId, body.customerId, actor);
  }

  @Get('workOrder/get/related_people')
  @ApiOperation({ summary: 'Get related people of work order' })
  getRelatedPeople(@Query('id') id: string) {
    return this.workService.getRelatedPeople(id);
  }

  @Post('workOrder/save-and-init-process')
  @ApiOperation({ summary: 'Save work order and init BPM process' })
  saveAndInitProcess(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.saveAndInitProcess(body, actor);
  }

  @Post('workOrder/update-init-process')
  @ApiOperation({ summary: 'Update work order and reinit process' })
  updateInitProcess(
    @Body() body: { workOrderId: string; processConfig?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.updateInitProcess(body.workOrderId, body.processConfig, actor);
  }

  @Post('workOrder/update/other_work_order')
  @ApiOperation({ summary: 'Link related work order' })
  addOtherWorkOrder(
    @Body() body: { workOrderId: string; relatedId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workService.addOtherWorkOrder(body.workOrderId, body.relatedId, actor);
  }

  @Get('workOrder/get/other_work_order')
  @ApiOperation({ summary: 'Get related work orders' })
  getOtherWorkOrders(@Query('id') id: string) {
    return this.workService.getOtherWorkOrders(id);
  }

  @Get('workOrder/list/pause')
  @ApiOperation({ summary: 'List paused work orders' })
  listPaused(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workService.listPausedWorkOrders(tenantId, Number(page ?? 1), Number(limit ?? 20));
  }

  // ── Work Inprogress ───────────────────────────────────────────────────────

  @Get('workInprogress/list')
  @ApiOperation({ summary: 'List work inprogress logs' })
  listWorkInprogress(
    @Query('workOrderId') workOrderId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workService.listWorkInprogress(workOrderId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('workInprogress/get')
  @ApiOperation({ summary: 'Get work inprogress record' })
  getWorkInprogress(@Query('id') id: string) {
    return this.workService.getWorkInprogress(id);
  }

  @Post('workInprogress/update')
  @ApiOperation({ summary: 'Add work inprogress record' })
  updateWorkInprogress(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.updateWorkInprogress(body, actor);
  }

  // ── Work Exchanges ────────────────────────────────────────────────────────

  @Get('workExchange/list')
  @ApiOperation({ summary: 'List work exchanges' })
  listWorkExchanges(
    @Query('workOrderId') workOrderId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workService.listWorkExchanges(workOrderId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('workExchange/get')
  @ApiOperation({ summary: 'Get work exchange' })
  getWorkExchange(@Query('id') id: string) {
    return this.workService.getWorkExchange(id);
  }

  @Post('workExchange/update')
  @ApiOperation({ summary: 'Add work exchange' })
  addWorkExchange(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.addWorkExchange(body, actor);
  }

  @Delete('workExchange/delete')
  @ApiOperation({ summary: 'Delete work exchange' })
  deleteWorkExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workService.deleteWorkExchange(id, actor);
  }

  // ── Employee Helpers ──────────────────────────────────────────────────────

  @Get('employee/managers')
  @ApiOperation({ summary: 'Get employee managers' })
  getEmployeeManagers(@TenantId() tenantId: string) {
    return this.workService.getEmployeeManagers(tenantId);
  }

  @Get('employee/assignees')
  @ApiOperation({ summary: 'Get employee assignees' })
  getEmployeeAssignees(@TenantId() tenantId: string) {
    return this.workService.getEmployeeAssignees(tenantId);
  }

  // ── Work Types ────────────────────────────────────────────────────────────

  @Get('workType/list')
  @ApiOperation({ summary: 'List work types' })
  listWorkTypes(@TenantId() tenantId: string, @Query('name') name?: string) {
    return this.workService.listWorkTypes(tenantId, { name });
  }

  @Get('workType/get')
  @ApiOperation({ summary: 'Get work type detail' })
  getWorkType(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.workService.getWorkType(id, tenantId);
  }

  @Post('workType/update')
  @ApiOperation({ summary: 'Create or update work type' })
  upsertWorkType(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.upsertWorkType(body, actor);
  }

  @Delete('workType/delete')
  @ApiOperation({ summary: 'Delete work type' })
  deleteWorkType(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workService.deleteWorkType(id, actor);
  }

  @Get('workOrder/report')
  @ApiOperation({ summary: 'Work order summary report' })
  workOrderReport(@TenantId() tenantId: string, @Query() q: Record<string, string>) {
    return this.workService.getWorkOrderReport(tenantId, q);
  }
}

// ── BPM Work Order Export Controller (separate prefix) ───────────────────────

import { Controller as C2 } from '@nestjs/common';

@ApiTags('work-bpm-export')
@ApiBearerAuth('JWT')
@C2('bpmapi')
export class WorkBpmController {
  constructor(private workService: WorkService) {}

  @Post('workOrder/list')
  @ApiOperation({ summary: 'List BPM work orders (POST)' })
  listBpmWorkOrders(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.workService.listWorkOrders(tenantId, body as Record<string, never>);
  }

  @Get('ola/export')
  @ApiOperation({ summary: 'Export OLA report' })
  exportOLA(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.exportOLA(tenantId, query);
  }

  @Get('sla/export')
  @ApiOperation({ summary: 'Export SLA report' })
  exportSLA(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workService.exportSLA(tenantId, query);
  }
}

// FE calls /sale/workInprogress/* and /sale/workExchange/*
@ApiTags('sale-work')
@ApiBearerAuth('JWT')
@C3('sale')
export class WorkSaleController {
  constructor(private workService: WorkService) {}

  @Get('workInprogress/list')
  listWorkInprogress(@Query('workOrderId') id: string, @Query('page') p?: string, @Query('limit') l?: string) {
    return this.workService.listWorkInprogress(id, Number(p ?? 1), Number(l ?? 20));
  }

  @Get('workInprogress/get')
  getWorkInprogress(@Query('id') id: string) {
    return this.workService.getWorkInprogress(id);
  }

  @Post('workInprogress/update')
  updateWorkInprogress(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.updateWorkInprogress(body, actor);
  }

  @Get('workExchange/list')
  listWorkExchanges(@Query('workOrderId') id: string, @Query('page') p?: string, @Query('limit') l?: string) {
    return this.workService.listWorkExchanges(id, Number(p ?? 1), Number(l ?? 20));
  }

  @Get('workExchange/get')
  getWorkExchange(@Query('id') id: string) {
    return this.workService.getWorkExchange(id);
  }

  @Post('workExchange/update')
  addWorkExchange(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workService.addWorkExchange(body, actor);
  }

  @Delete('workExchange/delete')
  deleteWorkExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workService.deleteWorkExchange(id, actor);
  }
}
