import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BoughtService } from './bought.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('bought')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class BoughtController {
  constructor(private boughtService: BoughtService) {}

  // ── BoughtCardService ─────────────────────────────────────────────────────

  @Get('boughtCardService/list')
  @ApiOperation({ summary: 'List bought card services' })
  listCardServices(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.boughtService.listBoughtCardServices(tenantId, {
      customerId: query.customerId,
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('boughtCardService/getBoughtCardServiceByCustomerId')
  @ApiOperation({ summary: 'List bought card services by customer' })
  listCardServicesByCustomer(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.boughtService.listByCustomerId(customerId, tenantId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('boughtCardService/update')
  @ApiOperation({ summary: 'Create bought card service' })
  addCardService(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.boughtService.upsertBoughtCardService(body, actor);
  }

  @Post('boughtCardService/update/cardNumber')
  @ApiOperation({ summary: 'Update card number' })
  updateCardNumber(
    @Body() body: { id: string; cardNumber: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.boughtService.updateCardNumber(body.id, body.cardNumber, actor);
  }

  @Delete('boughtCardService/delete')
  @ApiOperation({ summary: 'Delete bought card service' })
  deleteCardService(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.boughtService.deleteBoughtCardService(id, actor);
  }

  @Post('boughtCard/update')
  @ApiOperation({ summary: 'Create or update customer card' })
  updateCustomerCard(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.boughtService.updateCustomerCard(body, actor);
  }

  // ── LoyaltyPointLedger ────────────────────────────────────────────────────

  @Get('loyaltyPointLedger/list')
  @ApiOperation({ summary: 'List loyalty point ledger' })
  listLoyaltyPoints(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.boughtService.listLoyaltyPoints(tenantId, {
      customerId: query.customerId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // ── BoughtProduct ─────────────────────────────────────────────────────────

  @Get('boughtProduct/list')
  @ApiOperation({ summary: 'List bought products' })
  listProducts(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.boughtService.listBoughtProducts(tenantId, {
      customerId: query.customerId,
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('boughtProduct/get')
  @ApiOperation({ summary: 'Get bought product detail' })
  getProduct(@Query('id') id: string) {
    return this.boughtService.getBoughtProduct(id);
  }

  @Get('boughtProduct/getBoughtProductByCustomerId')
  @ApiOperation({ summary: 'List bought products by customer' })
  getProductsByCustomer(@Query('customerId') customerId: string) {
    return this.boughtService.listBoughtProductsByCustomer(customerId);
  }

  @Post('boughtProduct/update')
  @ApiOperation({ summary: 'Create or update bought product' })
  upsertProduct(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.boughtService.upsertBoughtProduct(body, actor);
  }

  @Delete('boughtProduct/delete')
  @ApiOperation({ summary: 'Delete bought product' })
  deleteProduct(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.boughtService.deleteBoughtProduct(id, actor);
  }

  // ── BoughtService ─────────────────────────────────────────────────────────

  @Get('boughtService/getBoughtServiceByCustomerId')
  @ApiOperation({ summary: 'List bought services by customer' })
  getServicesByCustomer(@Query('customerId') customerId: string) {
    return this.boughtService.listBoughtServicesByCustomer(customerId);
  }

  @Get('boughtService/get')
  @ApiOperation({ summary: 'Get bought service detail' })
  getService(@Query('id') id: string) {
    return this.boughtService.getBoughtService(id);
  }

  @Post('boughtService/update')
  @ApiOperation({ summary: 'Create or update bought service' })
  upsertService(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.boughtService.upsertBoughtService(body, actor);
  }

  @Delete('boughtService/delete')
  @ApiOperation({ summary: 'Delete bought service' })
  deleteService(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.boughtService.deleteBoughtService(id, actor);
  }
}
