import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmApprovalService } from './bpm-approval.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmApprovalController {
  constructor(private approvalService: BpmApprovalService) {}

  @Get('approvalDefinition/list')
  listDefinitions(@TenantId() tenantId: string) {
    return this.approvalService.listDefinitions(tenantId);
  }

  @Post('approvalDefinition/update')
  upsertDefinition(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.approvalService.upsertDefinition(body, actor);
  }

  @Delete('approvalDefinition/delete')
  deleteDefinition(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.approvalService.deleteDefinition(id, actor);
  }

  @Get('approval/list')
  @ApiOperation({ summary: 'List approvals' })
  listApprovals(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.approvalService.listApprovals(tenantId, query);
  }

  @Post('approval/approve')
  @ApiOperation({ summary: 'Approve an approval request' })
  approve(
    @Body() body: { id: string; comment?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.approvalService.approve(body.id, body.comment, actor);
  }

  @Post('approval/reject')
  @ApiOperation({ summary: 'Reject an approval request' })
  reject(
    @Body() body: { id: string; comment?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.approvalService.reject(body.id, body.comment, actor);
  }
}
