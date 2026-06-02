import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportObjectService } from './support-object.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('ticket')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class SupportObjectController {
  constructor(private supportObjectService: SupportObjectService) {}

  @Get('supportObject/list')
  @ApiOperation({ summary: 'List support objects (step assignments)' })
  list(
    @TenantId() tenantId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.supportObjectService.list(tenantId, {
      ticketId: query.ticketId,
      status: query.status !== undefined ? Number(query.status) : undefined,
      iamAssigneeId: query.iamAssigneeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // These are the actual frontend URLs from supportCommon
  @Post('supportLog/receive')
  @ApiOperation({ summary: 'Receive (claim) a support object — status 0→1' })
  receive(@Body() body: { id: string; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.supportObjectService.receive(body.id, body.note, actor);
  }

  @Post('supportLog/processDone')
  @ApiOperation({ summary: 'Mark support object done — status 1→2' })
  processDone(@Body() body: { id: string; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.supportObjectService.processDone(body.id, body.note, actor);
  }

  @Post('supportLog/processRejected')
  @ApiOperation({ summary: 'Mark support object rejected — status 1→3' })
  processRejected(@Body() body: { id: string; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.supportObjectService.processRejected(body.id, body.note, actor);
  }

  @Get('supportObject/reset')
  @ApiOperation({ summary: 'Reset support object back to pending' })
  resetTransferVotes(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.supportObjectService.resetTransferVotes(id, actor);
  }

  @Get('supportLog/list')
  @ApiOperation({ summary: 'List support logs for a support object' })
  listLogs(@Query('supportObjectId') supportObjectId: string) {
    return this.supportObjectService.listLogs(supportObjectId);
  }

  @Post('supportLog/update')
  @ApiOperation({ summary: 'Add support log entry' })
  addLog(@Body() body: { supportObjectId: string; action: number; status: number; note?: string }, @CurrentUser() actor: RequestUser) {
    return this.supportObjectService.addLog(body, actor);
  }
}
