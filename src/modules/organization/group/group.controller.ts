import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('group')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Get('group/list')
  @ApiOperation({ summary: 'List groups/teams' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.groupService.listGroups(tenantId, {
      name: query.name ?? query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('group/get')
  @ApiOperation({ summary: 'Get group detail' })
  get(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.groupService.getGroup(id, tenantId);
  }

  @Post('group/update')
  @ApiOperation({ summary: 'Create or update group' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.groupService.upsertGroup(body, actor);
  }

  @Delete('group/delete')
  @ApiOperation({ summary: 'Delete group' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.groupService.deleteGroup(id, actor);
  }

  @Get('groupEmployee/list')
  @ApiOperation({ summary: 'List employees in group' })
  listEmployees(
    @Query('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.groupService.listGroupEmployees(groupId, Number(page ?? 1), Number(limit ?? 50));
  }

  @Post('groupEmployee/update')
  @ApiOperation({ summary: 'Add employee to group' })
  addEmployee(
    @Body() body: { groupId: string; iamEmployeeId: string; role?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.groupService.addGroupEmployee(body, actor);
  }

  @Delete('groupEmployee/delete')
  @ApiOperation({ summary: 'Remove employee from group' })
  deleteEmployee(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.groupService.deleteGroupEmployee(id, actor);
  }
}
