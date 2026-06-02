import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalAdminService } from './approval-admin.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('approval-admin')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class ApprovalAdminController {
  constructor(private service: ApprovalAdminService) {}

  // ── Approval ──────────────────────────────────────────────────────────────

  @Get('approval/list')
  @ApiOperation({ summary: 'List approvals' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.list(tenantId, {
      keyword: query.keyword,
      status: query.status !== undefined ? Number(query.status) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('approval/update')
  @ApiOperation({ summary: 'Create or update approval' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsert(body, actor);
  }

  @Delete('approval/delete')
  @ApiOperation({ summary: 'Delete approval' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor);
  }

  @Post('approval/update/status')
  @ApiOperation({ summary: 'Update approval status' })
  updateStatus(
    @Body() body: { id: string; status: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.updateStatus(body.id, body.status, actor);
  }

  @Post('approval/update/alertConfig')
  @ApiOperation({ summary: 'Update approval alert config' })
  updateAlertConfig(
    @Body() body: { id: string; alertConfig: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.updateAlertConfig(body.id, body.alertConfig, actor);
  }

  // ── ApprovalConfig ────────────────────────────────────────────────────────

  @Get('approvalConfig/list')
  @ApiOperation({ summary: 'List approval configs' })
  listConfigs(
    @TenantId() tenantId: string,
    @Query('approvalId') approvalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listConfigs(tenantId, approvalId, { page: Number(page ?? 1), limit: Number(limit ?? 50) });
  }

  @Post('approvalConfig/update')
  @ApiOperation({ summary: 'Create or update approval config' })
  upsertConfig(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsertConfig(body, actor);
  }

  @Delete('approvalConfig/delete')
  @ApiOperation({ summary: 'Delete approval config' })
  deleteConfig(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.deleteConfig(id, actor);
  }

  // ── ApprovalLink ──────────────────────────────────────────────────────────

  @Get('approvalLink/list')
  @ApiOperation({ summary: 'List approval links' })
  listLinks(
    @TenantId() tenantId: string,
    @Query('approvalId') approvalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listLinks(tenantId, approvalId, { page: Number(page ?? 1), limit: Number(limit ?? 20) });
  }

  @Post('approvalLink/update')
  @ApiOperation({ summary: 'Create or update approval link' })
  upsertLink(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsertLink(body, actor);
  }

  @Delete('approvalLink/delete')
  @ApiOperation({ summary: 'Delete approval link' })
  deleteLink(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.deleteLink(id, actor);
  }

  // ── ApprovalObject ────────────────────────────────────────────────────────

  @Get('approvalObject/list')
  @ApiOperation({ summary: 'List approval objects' })
  listObjects(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.listObjects(tenantId, {
      approvalId: query.approvalId,
      objectType: query.objectType,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('approvalObject/get/object')
  @ApiOperation({ summary: 'Get approval object by ref' })
  getObjectByRef(
    @TenantId() tenantId: string,
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.service.getObjectByRef(objectType, objectId, tenantId);
  }

  @Get('approvalObject/checkApproved')
  @ApiOperation({ summary: 'Check if object is approved' })
  checkApproved(
    @TenantId() tenantId: string,
    @Query('objectType') objectType: string,
    @Query('objectId') objectId: string,
  ) {
    return this.service.checkApproved(objectType, objectId, tenantId);
  }

  @Post('approvalObject/update')
  @ApiOperation({ summary: 'Create or update approval object' })
  upsertObject(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsertObject(body, actor);
  }

  @Delete('approvalObject/delete')
  @ApiOperation({ summary: 'Delete approval object' })
  deleteObject(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.deleteObject(id, actor);
  }

  // ── ApprovalLog ───────────────────────────────────────────────────────────

  @Get('approvalLog/list')
  @ApiOperation({ summary: 'List approval logs' })
  listLogs(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.listLogs(tenantId, {
      approvalId: query.approvalId,
      approvalObjectId: query.approvalObjectId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('approvalLog/update')
  @ApiOperation({ summary: 'Create approval log entry' })
  upsertLog(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsertLog(body, actor);
  }

  @Delete('approvalLog/delete')
  @ApiOperation({ summary: 'Delete approval log' })
  deleteLog(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.deleteLog(id, actor);
  }
}
