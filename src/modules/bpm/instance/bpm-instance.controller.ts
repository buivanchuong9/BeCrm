import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmInstanceService } from './bpm-instance.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmInstanceController {
  constructor(private instanceService: BpmInstanceService) {}

  @Get('instance/list')
  @ApiOperation({ summary: 'List BPM process instances' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.instanceService.list(tenantId, {
      templateId: query.templateId,
      status: query.status,
      refType: query.refType,
      refId: query.refId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('instance/get')
  @ApiOperation({ summary: 'Get BPM instance with full graph + token state' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.instanceService.getById(id, tenantId);
  }

  @Post('instance/start')
  @ApiOperation({ summary: 'Start a new process instance' })
  start(
    @Query('templateId') templateId: string,
    @Body() body: { refType?: string; refId?: string; variables?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.instanceService.start(templateId, body, actor);
  }

  @Post('task/claim')
  @ApiOperation({ summary: 'Claim a UserTask token' })
  claimTask(@Query('tokenId') tokenId: string, @CurrentUser() actor: RequestUser) {
    return this.instanceService.claimTask(tokenId, actor);
  }

  @Post('task/complete')
  @ApiOperation({ summary: 'Complete a UserTask token — moves process to next node' })
  completeTask(
    @Query('tokenId') tokenId: string,
    @Body() body: { variables?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.instanceService.completeTask(tokenId, body.variables, actor);
  }

  @Get('instance/history')
  @ApiOperation({ summary: 'Get process instance history' })
  getHistory(@Query('instanceId') instanceId: string, @TenantId() tenantId: string) {
    return this.instanceService.getHistory(instanceId, tenantId);
  }

  @Get('instance/kanban')
  @ApiOperation({ summary: 'Get workflow Kanban view (active tokens per node)' })
  getKanbanView(@TenantId() tenantId: string, @Query('templateId') templateId: string) {
    return this.instanceService.getKanbanView(tenantId, templateId);
  }

  @Get('task/my')
  @ApiOperation({ summary: 'List my active task tokens' })
  listMyTasks(@CurrentUser() actor: RequestUser, @Query() query: Record<string, string>) {
    return this.instanceService.listMyTasks(actor, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // Legacy Kafka activation compatibility
  @Post('kafka/activateProcess')
  @ApiOperation({ summary: 'Activate process via event (legacy Kafka compat)' })
  activateProcess(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.instanceService.activateProcess(body, actor);
  }

  @Post('kafka/activate/receiveTask')
  @ApiOperation({ summary: 'Activate receive task via event (legacy Kafka compat)' })
  activateReceiveTask(@Body() body: { tokenId: string }, @CurrentUser() actor: RequestUser) {
    return this.instanceService.claimTask(body.tokenId, actor);
  }
}
