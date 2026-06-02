import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('employee')
@ApiBearerAuth('JWT')
@Controller('adminapi/department')
export class DepartmentController {
  constructor(private deptService: DepartmentService) {}

  @Get('list')
  @ApiOperation({ summary: 'List departments' })
  list(@TenantId() tenantId: string, @Query() query: { name?: string; page?: number; limit?: number }) {
    return this.deptService.list(tenantId, query);
  }

  @Get('get')
  @ApiOperation({ summary: 'Get department by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.deptService.getById(id, tenantId);
  }

  @Post('update')
  @ApiOperation({ summary: 'Create or update department' })
  upsert(
    @Body() body: { id?: string; name: string; code?: string; parentId?: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.deptService.upsert(body, actor);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete department' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.deptService.delete(id, actor);
  }

  @Post('update/parent')
  @ApiOperation({ summary: 'Update department parent' })
  updateParent(
    @Body() body: { id: string; parentId: string | null },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.deptService.updateParent(body.id, body.parentId, actor);
  }

  @Get('list/branch')
  @ApiOperation({ summary: 'List departments by branch (root level)' })
  listByBranch(@TenantId() tenantId: string) {
    return this.deptService.listByBranch(tenantId);
  }

  @Post('list/branch')
  @ApiOperation({ summary: 'List departments by branch (POST)' })
  listByBranchPost(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.deptService.listByBranch(tenantId);
  }
}
