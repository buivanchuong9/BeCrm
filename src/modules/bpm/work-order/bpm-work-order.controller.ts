import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmWorkOrderService } from './bpm-work-order.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

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
