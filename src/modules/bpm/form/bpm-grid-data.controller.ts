import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmGridDataService } from './bpm-grid-data.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm-grid-data')
@ApiBearerAuth('JWT')
@Controller('bpmapi/grid-data')
export class BpmGridDataController {
  constructor(private gridDataService: BpmGridDataService) {}

  @Post()
  @ApiOperation({ summary: 'Save GridAg (Excel) data submission' })
  saveGridData(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.gridDataService.saveGridData(body, actor);
  }

  @Post('lookup')
  @ApiOperation({ summary: 'Lookup GridAg data for formulas/dropdowns' })
  lookupGridData(@Body() body: Record<string, unknown>, @TenantId() tenantId: string) {
    return this.gridDataService.lookupGridData(body, tenantId);
  }
}
