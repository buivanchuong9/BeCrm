import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmTemplateService, GraphDto } from './bpm-template.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmTemplateController {
  constructor(private templateService: BpmTemplateService) {}

  @Get('process/list')
  @ApiOperation({ summary: 'List BPM process templates' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.templateService.list(tenantId, {
      name: query.name,
      status: query.status,
      category: query.category,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('process/get')
  @ApiOperation({ summary: 'Get BPM process template with graph' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.templateService.getById(id, tenantId);
  }

  @Post('process/create')
  @ApiOperation({ summary: 'Create BPM process template' })
  create(
    @Body() body: { name: string; code?: string; category?: string; description?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.create(body, actor);
  }

  @Post('process/update')
  @ApiOperation({ summary: 'Update BPM process template metadata' })
  update(
    @Query('id') id: string,
    @Body() body: { name?: string; category?: string; description?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.update(id, body, actor);
  }

  @Post('process/graph')
  @ApiOperation({ summary: 'Save/replace BPM workflow graph (nodes + edges)' })
  saveGraph(
    @Query('templateId') templateId: string,
    @Body() graph: GraphDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.templateService.saveGraph(templateId, graph, actor);
  }

  @Post('process/publish')
  @ApiOperation({ summary: 'Publish BPM process template (makes it runnable)' })
  publish(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.publish(id, actor);
  }

  @Delete('process/delete')
  @ApiOperation({ summary: 'Delete BPM process template' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.templateService.delete(id, actor);
  }
}
