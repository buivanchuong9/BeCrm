import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('schedule')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class ScheduleController {
  constructor(private svc: ScheduleService) {}

  @Get('schedule/list') @ApiOperation({ summary: 'List schedules' })
  list(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSchedules(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('schedule/list/by_customer') @ApiOperation({ summary: 'List schedules by customer' })
  listByCustomer(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listSchedules(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Get('schedule/get') @ApiOperation({ summary: 'Get schedule' })
  get(@Query('id') id: string) { return this.svc.getSchedule(id); }

  @Post('schedule/update') @ApiOperation({ summary: 'Upsert schedule' })
  upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSchedule(b, a); }

  @Delete('schedule/delete') @ApiOperation({ summary: 'Delete schedule' })
  delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSchedule(id, a); }

  @Post('schedule/cancel') @ApiOperation({ summary: 'Cancel schedule' })
  cancel(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cancelSchedule(id, a); }

  // ── scheduleConsultant ────────────────────────────────────────────────────
  @Get('scheduleConsultant/list') listConsultant(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listConsultantSchedules(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('scheduleConsultant/get') getConsultant(@Query('id') id: string) { return this.svc.getConsultantSchedule(id); }
  @Post('scheduleConsultant/update') upsertConsultant(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertConsultantSchedule(b, a); }
  @Delete('scheduleConsultant/delete') deleteConsultant(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteConsultantSchedule(id, a); }
  @Post('scheduleConsultant/updateKafka') updateConsultantKafka(@Body() b: Record<string, unknown>) { return { triggered: true, ...b }; }

  // ── treatmentRoom ─────────────────────────────────────────────────────────
  @Get('treatmentRoom/list') listRooms(@TenantId() t: string) { return this.svc.listRooms(t); }
  @Get('treatmentRoom/get') getRoom(@Query('id') id: string) { return this.svc.getRoom(id); }
  @Get('treatmentRoom/check') checkRoom(@Query('roomId') roomId: string, @Query('startTime') s: string, @Query('endTime') e: string) { return this.svc.checkRoom(roomId, s, e); }
  @Post('treatmentRoom/update') upsertRoom(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertRoom(b, a); }
  @Delete('treatmentRoom/delete') deleteRoom(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteRoom(id, a); }

  // ── treatmentHistory ──────────────────────────────────────────────────────
  @Get('treatmentHistory/list') listTreatments(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('treatmentHistory/list_all') listAllTreatments(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('treatmentHistory/list_by_customer') listTreatmentsByCustomer(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('treatmentHistory/get') getTreatment(@Query('id') id: string) { return this.svc.getTreatmentHistory(id); }
  @Post('treatmentHistory/update') upsertTreatment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTreatmentHistory(b, a); }
  @Delete('treatmentHistory/delete') deleteTreatment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTreatmentHistory(id, a); }

  // ── scheduleTreatment ─────────────────────────────────────────────────────
  @Get('scheduleTreatment/list') listScheduleTreatment(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('scheduleTreatment/get') getScheduleTreatment(@Query('id') id: string) { return this.svc.getTreatmentHistory(id); }
  @Post('scheduleTreatment/update') upsertScheduleTreatment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTreatmentHistory(b, a); }
  @Delete('scheduleTreatment/delete') deleteScheduleTreatment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTreatmentHistory(id, a); }
  @Post('scheduleTreatment/updateKafka') updateScheduleTreatmentKafka(@Body() b: Record<string, unknown>) { return { triggered: true }; }

  // ── treatmentTime ─────────────────────────────────────────────────────────
  @Get('treatmentTime/list_schedule_next') listNextSchedule(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listNextSchedule(t, q); }
  @Get('treatmentTime/get_byscheduler') getByScheduler(@Query('schedulerId') sid: string) { return this.svc.getByScheduler(sid); }
  @Post('treatmentTime/update_next') updateNext(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateNext(b, a); }
  @Post('treatmentTime/update_caring_employee') updateCaringEmployee(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateCaringEmployee(b, a); }
  // NOTE: treatmentTime/update, /delete, /get, /list are owned by IntegrationController (avoid duplicate routes)
}
