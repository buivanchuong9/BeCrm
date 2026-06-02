import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@ApiTags('ticket')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class TicketController {
  constructor(private ticketService: TicketService) {}

  // ── Tickets ───────────────────────────────────────────────────────────────

  @Get('ticket/list')
  @ApiOperation({ summary: 'List tickets' })
  list(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.ticketService.list(tenantId, {
      customerId: query.customerId,
      status: query.status !== undefined ? Number(query.status) : undefined,
      categoryId: query.categoryId,
      iamEmployeeId: query.iamEmployeeId,
      iamDepartmentId: query.iamDepartmentId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('ticket/get')
  @ApiOperation({ summary: 'Get ticket by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.ticketService.getById(id, tenantId);
  }

  @Post('ticket/update')
  @ApiOperation({ summary: 'Create or update ticket' })
  upsert(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.ticketService.upsert(body, actor);
  }

  @Post('ticket/update-and-init')
  @ApiOperation({ summary: 'Update ticket and initialize procedure (updateAndInit)' })
  updateAndInit(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    const id = body.id as string;
    return this.ticketService.collect(id, body, actor);
  }

  @Post('ticket/send/jssdk')
  @ApiOperation({ summary: 'Collect/submit ticket (jssdk)' })
  collect(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    const id = body.id as string;
    return this.ticketService.collect(id, body, actor);
  }

  @Post('ticket/update/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(
    @Body() body: { id: string; status: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.ticketService.updateStatus(body.id, body.status, actor);
  }

  @Delete('ticket/delete')
  @ApiOperation({ summary: 'Delete ticket' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.ticketService.delete(id, actor);
  }

  // ── Ticket Exchanges ──────────────────────────────────────────────────────

  @Get('ticketExchange/list')
  listExchanges(
    @Query('ticketId') ticketId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketService.listExchanges(ticketId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('ticketExchange/update')
  addExchange(
    @Body() body: { ticketId: string; content?: string; contentDelta?: string; mediaUrls?: object },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.ticketService.addExchange(body, actor);
  }

  @Delete('ticketExchange/delete')
  deleteExchange(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.ticketService.deleteExchange(id, actor);
  }

  // ── Ticket Categories ─────────────────────────────────────────────────────

  @Get('ticketCategory/list')
  listCategories(@TenantId() tenantId: string, @Query('type') type?: string) {
    return this.ticketService.listCategories(tenantId, type !== undefined ? Number(type) : undefined);
  }

  @Post('ticketCategory/update')
  upsertCategory(
    @Body() body: { id?: string; name: string; type?: number; position?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.ticketService.upsertCategory(body, actor);
  }

  @Delete('ticketCategory/delete')
  deleteCategory(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.ticketService.deleteCategory(id, actor);
  }

  // ── Ticket Process ────────────────────────────────────────────────────────

  @Post('ticketProcess/update')
  @ApiOperation({ summary: 'Update ticket process progress' })
  ticketProcessUpdate(
    @Body() body: { ticketId: string; supportObjectId?: string; note?: string; status?: number },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.ticketService.updateStatus(body.ticketId, body.status ?? 1, actor);
  }

  // ── QR Codes ──────────────────────────────────────────────────────────────

  @Get('qrCode/list')
  listQrCodes(@TenantId() tenantId: string) {
    return this.ticketService.listQrCodes(tenantId);
  }

  @Post('qrCode/update')
  upsertQrCode(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.ticketService.upsertQrCode(body, actor);
  }

  @Delete('qrCode/delete')
  deleteQrCode(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.ticketService.deleteQrCode(id, actor);
  }
}
