import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessRuleService } from './business-rule.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bpm')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BusinessRuleController {
  constructor(private businessRuleService: BusinessRuleService) {}

  @Get('businessRule/list')
  @ApiOperation({ summary: 'List business rules' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.businessRuleService.list(tenantId, {
      name: query.name,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('businessRule/detail')
  getById(@Query('id') id: string) {
    return this.businessRuleService.getById(id);
  }

  @Post('businessRule/update')
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.upsert(body, actor);
  }

  @Post('businessRule/updateActive')
  updateActive(@Body() body: { id: string; isActive: boolean }, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.updateActive(body.id, body.isActive, actor);
  }

  @Delete('businessRule/delete')
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.delete(id, actor);
  }

  @Post('rules/evaluate')
  @ApiOperation({ summary: 'Evaluate a business rule against a given payload' })
  evaluateRule(@Body() body: { ruleId?: string; ruleCode?: string; payload: Record<string, unknown> }, @TenantId() tenantId: string) {
    // Basic stub; the real implementation requires the engine or DMN table evaluator
    return {
      success: true,
      matched: true,
      result: { action: 'proceed' } // Mock response matching standard schema
    };
  }

  @Get('businessRuleItem/list')
  listItems(@Query('businessRuleId') businessRuleId: string) {
    return this.businessRuleService.listItems(businessRuleId);
  }

  @Post('businessRuleItem/update')
  upsertItem(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.upsertItem(body, actor);
  }

  @Post('businessRuleItem/updateActive')
  updateItemActive(@Body() body: { id: string; isActive: boolean }, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.updateItemActive(body.id, body.isActive, actor);
  }

  @Delete('businessRuleItem/delete')
  deleteItem(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.businessRuleService.deleteItem(id, actor);
  }
}
