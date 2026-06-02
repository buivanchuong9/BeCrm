import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketProcedureService } from './ticket-procedure.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('ticket')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class TicketProcedureController {
  constructor(private procedureService: TicketProcedureService) {}

  @Get('support/list')
  @ApiOperation({ summary: 'List ticket procedures' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.procedureService.list(tenantId, {
      name: query.name,
      status: query.status !== undefined ? Number(query.status) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('support/get')
  @ApiOperation({ summary: 'Get ticket procedure by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.procedureService.getById(id, tenantId);
  }

  @Post('support/update')
  @ApiOperation({ summary: 'Create or update ticket procedure' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.procedureService.upsert(body, actor);
  }

  @Delete('support/delete')
  @ApiOperation({ summary: 'Delete ticket procedure' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.procedureService.delete(id, actor);
  }

  @Get('ticketStep/list')
  @ApiOperation({ summary: 'List procedure steps' })
  listSteps(@Query('procedureId') procedureId: string, @TenantId() tenantId: string) {
    return this.procedureService.listSteps(procedureId, tenantId);
  }

  @Post('ticketStep/update')
  @ApiOperation({ summary: 'Create or update procedure step' })
  upsertStep(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.procedureService.upsertStep(body, actor);
  }

  @Delete('ticketStep/delete')
  @ApiOperation({ summary: 'Delete procedure step' })
  deleteStep(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.procedureService.deleteStep(id, actor);
  }
}
