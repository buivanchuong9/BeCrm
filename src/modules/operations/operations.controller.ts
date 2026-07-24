import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { OperationsService } from './operations.service';

const context = (req: Request) => ({
  requestId: req.requestId,
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

class AlertRequest {
  @IsIn([
    'new_red_flag_symptom',
    'worsening_symptoms',
    'treatment_failure',
    'urgent_contact_request',
    'abnormal_home_monitoring',
    'medication_side_effect',
    'missed_follow_up',
    'no_response',
    'medication_non_adherence',
  ])
  trigger!:
    | 'new_red_flag_symptom'
    | 'worsening_symptoms'
    | 'treatment_failure'
    | 'urgent_contact_request'
    | 'abnormal_home_monitoring'
    | 'medication_side_effect'
    | 'missed_follow_up'
    | 'no_response'
    | 'medication_non_adherence';
  @IsString() note!: string;
}
class EncounterRequestDto {
  @IsString() reason!: string;
  @IsString() requestedByRole!: string;
  @IsOptional() @IsUUID() sourceAlertId?: string;
}
class DecisionRequest {
  @IsIn(['approve', 'reject']) decision!: 'approve' | 'reject';
  @IsOptional() @IsString() department?: string;
}
class ClientEventRequest {
  @IsString() action!: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsUUID() encounterId?: string;
  @IsOptional() @IsObject() previousState?: Record<string, unknown> | null;
  @IsOptional() @IsObject() newState?: Record<string, unknown> | null;
  @IsString() reason!: string;
  @IsOptional() @IsString() sourceModule?: string;
  @IsIn(['info', 'warning', 'critical']) severity!: 'info' | 'warning' | 'critical';
  @IsOptional() @IsDateString() occurredAt?: string;
}
class PresignRequest {
  @IsString() fileName!: string;
  @IsString() contentType!: string;
  @IsIn(['clinical-document', 'progress-photo', 'avatar', 'intake-image']) context!: string;
}
class ConfirmUploadRequest {
  @IsString() fileHash!: string;
}
class SupportRequest {
  @IsString() topic!: string;
  @IsString() @MaxLength(4000) message!: string;
}
class MedicationScheduleDto {
  @IsString() timezone!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true })
  times!: string[];
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];
}
class ReminderRequest {
  @IsOptional() @IsUUID() prescriptionId?: string;
  @IsString() medicationName!: string;
  @ValidateNested()
  @Type(() => MedicationScheduleDto)
  schedule!: MedicationScheduleDto;
}
class PhotoRequest {
  @IsUUID() fileId!: string;
  @IsDateString() takenAt!: string;
  @IsOptional() @IsString() note?: string;
}
class DeletionRequest {
  @IsOptional() @IsString() reason?: string;
}
class RefillRequest {
  @IsOptional() @IsString() reason?: string;
}

@Controller({ path: 'patients', version: '1' })
export class PatientOperationsController {
  constructor(private readonly service: OperationsService) {}
  @RequireIdempotencyKey({ clinical: true })
  @Post(':patientId/alerts')
  createAlert(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() d: AlertRequest,
    @Req() r: Request,
  ) {
    return this.service.createAlert(p, id, d.trigger, d.note, context(r));
  }
  @Get(':patientId/alerts') alerts(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.patientAlerts(p, id);
  }
  @RequireIdempotencyKey() @Post(':patientId/encounter-requests') encounterRequest(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() d: EncounterRequestDto,
    @Req() r: Request,
  ) {
    return this.service.requestEncounter(p, id, d, context(r));
  }
  @Get(':patientId/medication-reminders') reminders(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.reminders(p, id);
  }
  @Post(':patientId/medication-reminders') addReminder(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() d: ReminderRequest,
    @Req() r: Request,
  ) {
    return this.service.addReminder(p, id, d, context(r));
  }
  @Post(':patientId/progress-photos') progressPhoto(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Body() d: PhotoRequest,
    @Req() r: Request,
  ) {
    return this.service.addProgressPhoto(p, id, d, context(r));
  }
  @Get(':patientId/health-summary') healthSummary(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.healthSummary(p, id);
  }
  @Get(':patientId/health-score-history') healthHistory(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.healthHistory(p, id);
  }
  @Get(':patientId/reports/overview') overview(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.report(p, id, 'overview');
  }
  @Get(':patientId/reports/treatment-history') treatment(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.report(p, id, 'treatment-history');
  }
  @Get(':patientId/reports/medicine-history') medicine(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.report(p, id, 'medicine-history');
  }
  @Get(':patientId/reports/ai-summary') ai(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
  ) {
    return this.service.report(p, id, 'ai-summary');
  }
  @Get(':patientId/reports/export') async export(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (format === 'pdf') {
      const file = await this.service.exportReportPdf(p, id);
      res.type('application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dermahealth-${id}.pdf"`);
      return file;
    }
    return this.service.exportReport(p, id);
  }
}

@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(private readonly service: OperationsService) {}
  @Get() list(@CurrentUser() p: AuthenticatedPrincipal, @Query('status') status?: string) {
    return this.service.alerts(p, status);
  }
  @Post(':alertId/close') close(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('alertId', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.closeAlert(p, id, context(r));
  }
}

@Controller({ path: 'encounter-requests', version: '1' })
export class EncounterRequestsController {
  constructor(private readonly service: OperationsService) {}
  @Get() list(@CurrentUser() p: AuthenticatedPrincipal, @Query('status') status?: string) {
    return this.service.encounterRequests(p, status);
  }
  @RequireIdempotencyKey({ clinical: true })
  @Post(':requestId/decide')
  decide(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('requestId', ParseUUIDPipe) id: string,
    @Body() d: DecisionRequest,
    @Req() r: Request,
  ) {
    return this.service.decideEncounterRequest(p, id, d.decision, d.department, context(r));
  }
}

@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly service: OperationsService) {}
  @Get() list(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Query()
    q: {
      entityType?: string;
      patientId?: string;
      encounterId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.service.auditEvents(p, q);
  }
  @Get('encounters/:id') encounter(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.auditEvents(p, { encounterId: id });
  }
  @Get('patients/:id') patient(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.auditEvents(p, { patientId: id });
  }
  @Post('client-events') client(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Body() d: ClientEventRequest,
    @Req() r: Request,
  ) {
    return this.service.clientEvent(p, d, context(r));
  }
}

@Controller({ path: 'integrations', version: '1' })
export class IntegrationsController {
  constructor(private readonly service: OperationsService) {}
  @Get('connections') connections(@CurrentUser() p: AuthenticatedPrincipal) {
    return this.service.connections(p);
  }
  @Get('connections/:id/messages') messages(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.messages(p, id);
  }
  @Post('connections/:id/retry') retry(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.retryConnection(p, id, context(r));
  }
  @Post('connections/:id/reconcile') reconcile(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.reconcileConnection(p, id, context(r));
  }
}

@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly service: OperationsService) {}
  @Get('operational-kpis') kpis(@CurrentUser() p: AuthenticatedPrincipal) {
    return this.service.operationalKpis(p);
  }
}

@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private readonly service: OperationsService) {}
  @Post('presign') presign(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Body() d: PresignRequest,
    @Req() r: Request,
  ) {
    return this.service.presign(p, d, context(r));
  }
  @Post(':fileId/confirm') confirm(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('fileId', ParseUUIDPipe) id: string,
    @Body() d: ConfirmUploadRequest,
    @Req() r: Request,
  ) {
    return this.service.confirmUpload(p, id, d.fileHash, context(r));
  }
}

@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly service: OperationsService) {}
  @Post('tickets') create(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Body() d: SupportRequest,
    @Req() r: Request,
  ) {
    return this.service.supportTicket(p, d.topic, d.message, context(r));
  }
}

@Controller({ path: 'medication-reminders', version: '1' })
export class MedicationRemindersController {
  constructor(private readonly service: OperationsService) {}
  @Patch(':id/taken') taken(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.reminderTaken(p, id, context(r));
  }
}

@Controller({ path: 'prescriptions', version: '1' })
export class PrescriptionOperationsController {
  constructor(private readonly service: OperationsService) {}
  @Post(':id/refill-request') refill(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: RefillRequest,
    @Req() r: Request,
  ) {
    return this.service.requestRefill(p, id, d.reason, context(r));
  }
}

@Controller({ path: 'users', version: '1' })
export class UserOperationsController {
  constructor(private readonly service: OperationsService) {}
  @Post(':id/deletion-request') deletion(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: DeletionRequest,
    @Req() r: Request,
  ) {
    return this.service.deletionRequest(p, id, d.reason, context(r));
  }
}
