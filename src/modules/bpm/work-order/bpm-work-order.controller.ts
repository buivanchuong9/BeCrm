import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmWorkOrderService } from './bpm-work-order.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { Controller as C2 } from '@nestjs/common';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi/workOrder')
export class BpmWorkOrderController {
  constructor(private workOrderService: BpmWorkOrderService) {}

  @Get('list')
  @ApiOperation({ summary: 'List work orders' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workOrderService.list(tenantId, {
      instanceId: query.instanceId,
      status: query.status,
      iamAssigneeId: query.iamAssigneeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('get')
  @ApiOperation({ summary: 'Get work order by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.workOrderService.getById(id, tenantId);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create work order' })
  create(
    @Body() body: { instanceId: string; title: string; content?: string; iamAssigneeId?: string; priority?: number; dueDate?: string; note?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workOrderService.create({ ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined }, actor);
  }

  @Post('update')
  @ApiOperation({ summary: 'Update work order' })
  update(@Query('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.update(id, body, actor);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete work order' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.delete(id, actor);
  }

  @Post('exchange/add')
  @ApiOperation({ summary: 'Add exchange message to work order' })
  addExchange(
    @Body() body: { workOrderId: string; content?: string; mediaUrls?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workOrderService.addExchange(body, actor);
  }

  @Delete('exchange/delete')
  @ApiOperation({ summary: 'Delete work order exchange' })
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.deleteExchange(id, actor);
  }
}

// ── userTask/* alias controller (maps to Work Order runtime operations) ────────
// FE uses /bpmapi/userTask/* for the "Ca bệnh chờ xử lý" screen

@ApiTags('bpm-user-task')
@ApiBearerAuth('JWT')
@C2('bpmapi/userTask')
export class BpmUserTaskRuntimeController {
  constructor(private workOrderService: BpmWorkOrderService) {}

  @Get('list')
  @ApiOperation({ summary: 'List work orders (userTask alias)' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.workOrderService.list(tenantId, {
      instanceId: query.instanceId,
      status: query.status,
      iamAssigneeId: query.iamAssigneeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('get')
  @ApiOperation({ summary: 'Get work order by id (userTask alias)' })
  get(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.workOrderService.getById(id, tenantId);
  }

  // Section 4 general update: accepts IWorkOrderRequestModel
  @Post('update')
  @ApiOperation({ summary: 'Update work order (full payload)' })
  update(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    const id = (body.id ?? body.workOrderId) as string;
    return this.workOrderService.updateFull(id, body, actor);
  }

  @Post('updateStatus')
  @ApiOperation({ summary: 'Update work order status' })
  updateStatus(@Body() body: { id: string; status: number | string }, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.updateStatus(body.id, String(body.status), actor);
  }

  @Post('updateRating')
  @ApiOperation({ summary: 'Update work order rating' })
  updateRating(@Body() body: { worId: string; mark: number; content?: string }, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.updateRating(body, actor);
  }

  @Post('addWorkExchange')
  @ApiOperation({ summary: 'Add comment/exchange to work order' })
  addWorkExchange(
    @Body() body: { worId: string; content?: string; employeeId?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.workOrderService.addWorkExchange(body, actor);
  }

  @Post('updateParticipant')
  @ApiOperation({ summary: 'Update work order participants' })
  updateParticipant(@Body() body: { id: string; participants: string }, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.updateParticipants(body.id, body.participants, actor);
  }

  @Post('updateCustomer')
  @ApiOperation({ summary: 'Update work order customers' })
  updateCustomer(@Body() body: { id: string; customers: string }, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.updateCustomers(body.id, body.customers, actor);
  }

  @Post('updatePriorityLevel')
  @ApiOperation({ summary: 'Update work order priority level' })
  updatePriorityLevel(@Body() body: { id: string; priorityLevel: number }, @CurrentUser() actor: RequestUser) {
    return this.workOrderService.updatePriorityLevel(body.id, body.priorityLevel, actor);
  }

  @Post('updatePause')
  @ApiOperation({ summary: 'Toggle pause/resume on work order' })
  updatePause(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    const id = (body.id ?? body.workOrderId) as string;
    return this.workOrderService.updatePause(id, actor);
  }
}
