import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DecisionTableService } from './decision-table.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('decision-table')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class DecisionTableController {
  constructor(private svc: DecisionTableService) {}

  @Get('decisionTable/list') list(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.list(t, Number(p ?? 1), Number(l ?? 20)); }
  @Get('decisionTable/detail') getById(@Query('id') id: string) { return this.svc.getById(id); }
  @Post('decisionTable/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsert(b, a); }
  @Delete('decisionTable/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.delete(id, a); }
  @Post('decisionTable/updateActive') updateActive(@Body() b: { id: string; isActive: boolean }, @CurrentUser() a: RequestUser) { return this.svc.updateActive(b.id, b.isActive, a); }

  @Post('decisionTableInput/update') upsertInput(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertInput(b, a); }
  @Delete('decisionTableInput/delete') deleteInput(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteInput(id, a); }
  @Post('decisionTableInput/updateActive') updateInputActive(@Body() b: { id: string; isActive: boolean }, @CurrentUser() a: RequestUser) { return this.svc.updateInputActive(b.id, b.isActive, a); }

  @Post('decisionTableOutput/update') upsertOutput(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertOutput(b, a); }
  @Delete('decisionTableOutput/delete') deleteOutput(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteOutput(id, a); }
  @Post('decisionTableOutput/updateActive') updateOutputActive(@Body() b: { id: string; isActive: boolean }, @CurrentUser() a: RequestUser) { return this.svc.updateOutputActive(b.id, b.isActive, a); }
}
