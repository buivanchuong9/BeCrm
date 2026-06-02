import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarrantyProcedureService } from './warranty-procedure.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('warranty')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class WarrantyProcedureController {
  constructor(private procedureService: WarrantyProcedureService) {}

  // warrantyProc uses same /support/* path as ticketProc (shared in frontend)
  // These are accessed with objectType filtering at the service layer
  @Get('warrantyProc/list')
  @ApiOperation({ summary: 'List warranty procedures' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.procedureService.list(tenantId, {
      name: query.name,
      status: query.status !== undefined ? Number(query.status) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('warrantyProc/get')
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.procedureService.getById(id, tenantId);
  }

  @Post('warrantyProc/update')
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.procedureService.upsert(body, actor);
  }

  @Delete('warrantyProc/delete')
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.procedureService.delete(id, actor);
  }

  @Get('warrantyStep/list')
  listSteps(@Query('procedureId') procedureId: string, @TenantId() tenantId: string) {
    return this.procedureService.listSteps(procedureId, tenantId);
  }

  @Post('warrantyStep/update')
  upsertStep(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.procedureService.upsertStep(body, actor);
  }

  @Delete('warrantyStep/delete')
  deleteStep(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.procedureService.deleteStep(id, actor);
  }
}
