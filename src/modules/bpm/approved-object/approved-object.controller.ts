import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovedObjectService } from './approved-object.service';
import { TenantId } from '../../../shared/decorators/tenant.decorator';

@ApiTags('approved-object')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class ApprovedObjectController {
  constructor(private service: ApprovedObjectService) {}

  @Get('approvedObjectLog/list')
  @ApiOperation({ summary: 'List approved object logs' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.list(tenantId, {
      objectType: query.objectType,
      objectId: query.objectId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
