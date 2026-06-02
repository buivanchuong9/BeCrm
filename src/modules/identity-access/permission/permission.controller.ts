import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
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
}
