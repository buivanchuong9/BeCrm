import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EformMappingService } from './eform-mapping.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('eform-mapping')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class EformMappingController {
  constructor(private service: EformMappingService) {}

  @Get('eformMapping/list/source')
  @ApiOperation({ summary: 'List eform mappings (source)' })
  listSource(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.listSource(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('eformMapping/get')
  @ApiOperation({ summary: 'Get eform mapping' })
  get(@Query('id') id: string) {
    return this.service.getById(id);
  }

  @Post('eformMapping/update')
  @ApiOperation({ summary: 'Create or update eform mapping' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.service.upsert(body, actor);
  }

  @Delete('eformMapping/delete')
  @ApiOperation({ summary: 'Delete eform mapping' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor);
  }
}
