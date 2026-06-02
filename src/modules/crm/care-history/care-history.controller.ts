import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CareHistoryService } from './care-history.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('contact')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class CareHistoryController {
  constructor(private careHistoryService: CareHistoryService) {}

  @Get('crmCareHistory/list')
  @ApiOperation({ summary: 'List care histories' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.careHistoryService.list(tenantId, {
      customerId: query.customerId,
      contactId: query.contactId,
      careCategoryId: query.careCategoryId,
      iamEmployeeId: query.iamEmployeeId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('crmCareHistory/update')
  @ApiOperation({ summary: 'Create care history entry' })
  create(
    @Body() body: {
      careCategoryId?: string; objectType: string;
      customerId?: string; contactId?: string;
      content?: string; status?: number; occurredAt?: string;
    },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.careHistoryService.create({
      ...body,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    }, actor);
  }

  @Delete('crmCareHistory/delete')
  @ApiOperation({ summary: 'Delete care history' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.careHistoryService.delete(id, actor);
  }

  // Care categories
  @Get('crmCampaign/list')
  @ApiOperation({ summary: 'List care categories (crmCampaign)' })
  listCategories(@TenantId() tenantId: string) {
    return this.careHistoryService.listCategories(tenantId);
  }

  @Post('crmCampaign/update')
  @ApiOperation({ summary: 'Create or update care category' })
  upsertCategory(
    @Body() body: { id?: string; name: string; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.careHistoryService.upsertCategory(body, actor);
  }

  @Delete('crmCampaign/delete')
  @ApiOperation({ summary: 'Delete care category' })
  deleteCategory(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.careHistoryService.deleteCategory(id, actor);
  }
}
