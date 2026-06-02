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

  @Get('schedule/get') @ApiOperation({ summary: 'Get schedule' })
  get(@Query('id') id: string) { return this.svc.getSchedule(id); }

  @Post('schedule/update') @ApiOperation({ summary: 'Upsert schedule' })
  upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSchedule(b, a); }

  @Delete('schedule/delete') @ApiOperation({ summary: 'Delete schedule' })
  delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSchedule(id, a); }

  @Post('schedule/cancel') @ApiOperation({ summary: 'Cancel schedule' })
  cancel(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cancelSchedule(id, a); }

  @Get('scheduleConsultant/list') @ApiOperation({ summary: 'List consultant schedules' })
  listConsultant(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listConsultantSchedules(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Post('scheduleConsultant/update') @ApiOperation({ summary: 'Upsert consultant schedule' })
  upsertConsultant(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertConsultantSchedule(b, a); }

  @Delete('scheduleConsultant/delete') @ApiOperation({ summary: 'Delete consultant schedule' })
  deleteConsultant(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteConsultantSchedule(id, a); }

  @Get('treatmentRoom/list') @ApiOperation({ summary: 'List treatment rooms' })
  listRooms(@TenantId() t: string) { return this.svc.listRooms(t); }

  @Post('treatmentRoom/update') @ApiOperation({ summary: 'Upsert treatment room' })
  upsertRoom(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertRoom(b, a); }

  @Delete('treatmentRoom/delete') @ApiOperation({ summary: 'Delete treatment room' })
  deleteRoom(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteRoom(id, a); }

  @Get('treatmentHistory/list') @ApiOperation({ summary: 'List treatment histories' })
  listTreatments(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Post('treatmentHistory/update') @ApiOperation({ summary: 'Upsert treatment history' })
  upsertTreatment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTreatmentHistory(b, a); }

  @Delete('treatmentHistory/delete') @ApiOperation({ summary: 'Delete treatment history' })
  deleteTreatment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTreatmentHistory(id, a); }

  @Get('scheduleTreatment/list') @ApiOperation({ summary: 'List treatment schedules' })
  listScheduleTreatment(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listTreatmentHistories(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }

  @Post('scheduleTreatment/update') @ApiOperation({ summary: 'Upsert treatment schedule' })
  upsertScheduleTreatment(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertTreatmentHistory(b, a); }

  @Delete('scheduleTreatment/delete') @ApiOperation({ summary: 'Delete treatment schedule' })
  deleteScheduleTreatment(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteTreatmentHistory(id, a); }
}
