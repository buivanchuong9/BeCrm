import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { Controller as RootController } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@Controller('adminapi/permission')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get('resource')
  @ApiOperation({ summary: 'Get user permission resources' })
  getResources(@CurrentUser() actor: RequestUser) {
    return this.permissionService.getResources(actor);
  }

  @Get('info')
  @ApiOperation({ summary: 'Get department permission info' })
  getDepartmentInfo(@CurrentUser() actor: RequestUser) {
    return this.permissionService.getDepartmentInfo(actor);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add permission to role' })
  addPermission(
    @Body() body: { roleId: string; resourceCode: string; action: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.permissionService.addPermission(body.roleId, body.resourceCode, body.action, actor);
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove permission from role' })
  removePermission(@Body() body: { roleId: string; resourceCode: string; action: string }) {
    return this.permissionService.removePermission(body.roleId, body.resourceCode, body.action);
  }

  @Post('clone')
  @ApiOperation({ summary: 'Clone permissions from source role/department to target' })
  clonePermissions(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.permissionService.clonePermissions(body, actor);
  }
}

// rolePermission/* and requestPermission/* live at /adminapi root (not under /permission)
@ApiTags('auth')
@ApiBearerAuth('JWT')
@RootController('adminapi')
export class RolePermissionController {
  constructor(private permissionService: PermissionService) {}

  // ── rolePermission ──────────────────────────────────────────────────────
  @Get('rolePermission/info')
  @ApiOperation({ summary: 'Get role permission info' })
  getRolePermissionInfo(@Query('roleId') roleId: string) {
    return this.permissionService.getRolePermissionInfo(roleId);
  }

  @Get('rolePermission/add')
  @ApiOperation({ summary: 'Add role permission (GET per FE contract)' })
  addRolePermissionGet(@Query() q: { roleId: string; resourceCode: string; action: string }, @CurrentUser() actor: RequestUser) {
    return this.permissionService.addRolePermission(q, actor);
  }

  @Post('rolePermission/add')
  @ApiOperation({ summary: 'Add role permission' })
  addRolePermission(@Body() body: { roleId: string; resourceCode: string; action: string }, @CurrentUser() actor: RequestUser) {
    return this.permissionService.addRolePermission(body, actor);
  }

  @Delete('rolePermission/remove')
  @ApiOperation({ summary: 'Remove role permission' })
  removeRolePermission(@Body() body: { roleId: string; resourceCode: string; action: string }) {
    return this.permissionService.removeRolePermission(body);
  }

  // ── requestPermission ────────────────────────────────────────────────────
  @Get('requestPermission/list/source')
  @ApiOperation({ summary: 'List permission requests created by current user' })
  listRequestSource(@CurrentUser() actor: RequestUser) {
    return this.permissionService.listRequestPermissionSource(actor);
  }

  @Get('requestPermission/list/target')
  @ApiOperation({ summary: 'List permission requests to approve' })
  listRequestTarget(@CurrentUser() actor: RequestUser) {
    return this.permissionService.listRequestPermissionTarget(actor);
  }

  @Post('requestPermission/update/approved')
  @ApiOperation({ summary: 'Approve permission request' })
  approveRequest(@Body() body: { id?: string }, @CurrentUser() actor: RequestUser) {
    return this.permissionService.updateRequestPermissionStatus(body.id ?? '', 'approved', actor);
  }

  @Post('requestPermission/update/rejected')
  @ApiOperation({ summary: 'Reject permission request' })
  rejectRequest(@Body() body: { id?: string }, @CurrentUser() actor: RequestUser) {
    return this.permissionService.updateRequestPermissionStatus(body.id ?? '', 'rejected', actor);
  }
}
