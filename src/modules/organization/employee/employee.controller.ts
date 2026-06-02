import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('employee')
@ApiBearerAuth('JWT')
@Controller('adminapi/employee')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @Get('list')
  @ApiOperation({ summary: 'List employees' })
  list(
    @TenantId() tenantId: string,
    @Query() query: { name?: string; departmentId?: string; page?: number; limit?: number },
  ) {
    return this.employeeService.list(tenantId, query);
  }

  @Get('get')
  @ApiOperation({ summary: 'Get employee by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.employeeService.getById(id, tenantId);
  }

  @Get('info')
  @ApiOperation({ summary: 'Get current employee info' })
  getInfo(@TenantId() tenantId: string, @CurrentUser() actor: RequestUser) {
    return this.employeeService.getInfo(tenantId, actor.id);
  }

  @Post('update')
  @ApiOperation({ summary: 'Create or update employee' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.employeeService.upsert(body as Parameters<EmployeeService['upsert']>[0], actor);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete employee' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.employeeService.delete(id, actor);
  }

  @Post('link_user')
  @ApiOperation({ summary: 'Link employee to user account' })
  linkUser(
    @Body() body: { employeeId: string; userId: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.employeeService.linkUser(body.employeeId, body.userId, actor);
  }

  @Get('list/department')
  @ApiOperation({ summary: 'List employees by department' })
  listByDepartment(@Query('departmentId') departmentId: string, @TenantId() tenantId: string) {
    return this.employeeService.listByDepartment(departmentId, tenantId);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get employee roles' })
  getRoles(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.employeeService.getRoles(id, tenantId);
  }

  @Get('init')
  @ApiOperation({ summary: 'Init employee form data (departments, roles)' })
  init(@TenantId() tenantId: string, @CurrentUser() actor: RequestUser) {
    return this.employeeService.init(tenantId, actor);
  }

  @Get('listExTip')
  @ApiOperation({ summary: 'List employees for quick select' })
  listExTip(@TenantId() tenantId: string) {
    return this.employeeService.listExTip(tenantId);
  }

  @Get('random_pass')
  @ApiOperation({ summary: 'Generate random password' })
  generateRandomPass() {
    return this.employeeService.generateRandomPass();
  }

  @Post('update_token')
  @ApiOperation({ summary: 'Update employee token/device' })
  updateToken(
    @Body() body: { employeeId: string; token: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.employeeService.updateToken(body.employeeId, body.token, actor);
  }

  @Get('check_email_connection')
  @ApiOperation({ summary: 'Check employee email connection' })
  checkEmailConnection(@Query('id') id: string) {
    return this.employeeService.checkEmailConnection(id);
  }

  @Post('disconnect_email')
  @ApiOperation({ summary: 'Disconnect employee email' })
  disconnectEmail(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.employeeService.disconnectEmail(id, actor);
  }
}
