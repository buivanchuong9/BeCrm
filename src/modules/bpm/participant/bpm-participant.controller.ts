import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmParticipantService } from './bpm-participant.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm-participant')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmParticipantController {
  constructor(private service: BpmParticipantService) {}

  @Get('bpmParticipant/list')
  @ApiOperation({ summary: 'List BPM participants' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.list(tenantId, {
      templateId: query.templateId,
      nodeKey: query.nodeKey,
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('bpmParticipant/get')
  @ApiOperation({ summary: 'Get BPM participant' })
  get(@Query('id') id: string) {
    return this.service.getById(id);
  }

  @Post('bpmParticipant/update')
  @ApiOperation({ summary: 'Create or update BPM participant' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsert(body, actor);
  }

  @Delete('bpmParticipant/delete')
  @ApiOperation({ summary: 'Delete BPM participant' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor);
  }

  @Get('identity/users-and-groups')
  @ApiOperation({ summary: 'List available users and roles for assignment' })
  getUsersAndGroups(@TenantId() tenantId: string) {
    return this.service.getUsersAndGroups(tenantId);
  }
}
