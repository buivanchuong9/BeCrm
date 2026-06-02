import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get('role/list')
  @ApiOperation({ summary: 'List roles' })
  list(@TenantId() tenantId: string, @Query() query: { name?: string; page?: number; limit?: number }) {
    return this.roleService.list(tenantId, query);
  }

  @Get('role/get')
  @ApiOperation({ summary: 'Get role by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.roleService.getById(id, tenantId);
  }

  @Post('role/update')
  @ApiOperation({ summary: 'Create or update role' })
  upsert(
    @Body() body: { id?: string; name: string; code: string; description?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.roleService.upsert(body, actor);
  }

  @Delete('role/delete')
  @ApiOperation({ summary: 'Delete role' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.roleService.delete(id, actor);
  }

  @Post('roleEmployee/insert-batch')
  @ApiOperation({ summary: 'Batch assign roles to employee' })
  insertBatchEmployeeRoles(
    @Body() body: { employeeId: string; roleIds: string[] },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.roleService.insertBatchEmployeeRoles(body.employeeId, body.roleIds, actor);
  }

  @Get('roleEmployee/list')
  @ApiOperation({ summary: 'Get roles for an employee' })
  getEmployeeRoles(@Query('employeeId') employeeId: string, @TenantId() tenantId: string) {
    return this.roleService.getEmployeeRoles(employeeId, tenantId);
  }

  @Delete('roleEmployee/delete')
  @ApiOperation({ summary: 'Delete employee role assignment' })
  deleteEmployeeRole(@Query('id') id: string) {
    return this.roleService.deleteUserRole(id);
  }
}
