import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordBreakGlassService } from './medical-record-break-glass.service';

function ctx(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

class MedicationDto {
  @IsString() name!: string;
  @IsString() dose!: string;
  @IsInt() @Min(1) durationDays!: number;
}
class PrescriptionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications!: MedicationDto[];
}
class DiagnosisDto {
  @IsUUID() diagnosisId!: string;
  @IsInt() @Min(1) version!: number;
}
class DischargeDto {
  @IsOptional() @IsObject() discharge?: { instructions: string[]; followUpNeeded: boolean };
  @IsOptional() @IsObject() followUp?: { description: string; dueInDays: number };
  @IsInt() @Min(1) version!: number;
}
class DocumentDto {
  @Transform(trim) @IsString() @Length(1, 100) type!: string;
  @IsUUID() fileId!: string;
  @IsOptional() @IsUUID() workflowTaskId?: string;
  @IsOptional() @IsUUID() clinicalOrderId?: string;
}
class ReasonDto {
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}
class TextDto {
  @Transform(trim) @IsString() @Length(1, 5000) text!: string;
}
class LateResultDto {
  @Transform(trim) @IsString() @Length(3, 2000) description!: string;
}
class CreateMedicalRecordBreakGlassGrantDto {
  @Transform(trim) @IsString() @Length(10, 1000) reason!: string;
  @IsString() @Length(6, 12) mfaCode!: string;
}

@Controller({ path: 'encounters', version: '1' })
export class MedicalRecordsController {
  constructor(
    private readonly service: MedicalRecordsService,
    private readonly breakGlass: MedicalRecordBreakGlassService,
  ) {}
  @Get(':encounterId/medical-record') get(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.ensureDraft(p, id, ctx(r));
  }
  @ApiOperation({
    summary: '🆕 Mới trong v2.6 — Yêu cầu quyền truy cập khẩn cấp (break-glass) vào hồ sơ',
  })
  @RequireIdempotencyKey()
  @Post(':encounterId/medical-record/break-glass-grants')
  requestBreakGlass(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: CreateMedicalRecordBreakGlassGrantDto,
    @Req() r: Request,
  ) {
    return this.breakGlass.create(p, id, d, ctx(r));
  }
  @RequireIdempotencyKey()
  @Post(':encounterId/prescriptions')
  prescribe(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: PrescriptionDto,
    @Req() r: Request,
  ) {
    return this.service.prescribe(p, id, d.medications, ctx(r));
  }
  @Get(':encounterId/prescriptions') prescriptions(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
  ) {
    return this.service.listPrescriptions(p, id);
  }
  @RequireIdempotencyKey()
  @Post(':encounterId/documents')
  document(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: DocumentDto,
    @Req() r: Request,
  ) {
    return this.service.addDocument(p, id, d, ctx(r));
  }
  @Get(':encounterId/documents') documents(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
  ) {
    return this.service.listDocuments(p, id);
  }
  @Patch(':encounterId/medical-record/diagnosis') diagnosis(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: DiagnosisDto,
    @Req() r: Request,
  ) {
    return this.service.attachDiagnosis(p, id, d, ctx(r));
  }
  @Patch(':encounterId/medical-record/discharge-followup') discharge(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: DischargeDto,
    @Req() r: Request,
  ) {
    return this.service.setDischarge(p, id, d, ctx(r));
  }
}

@Controller({ path: 'medical-records', version: '1' })
export class RecordActionsController {
  constructor(private readonly service: MedicalRecordsService) {}
  @Get(':recordId/completion-check') check(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('recordId', ParseUUIDPipe) id: string,
  ) {
    return this.service.completionCheck(p, id);
  }
  @Post(':recordId/sign') sign(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('recordId', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.sign(p, id, ctx(r));
  }
  @Post(':recordId/addendum') addendum(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('recordId', ParseUUIDPipe) id: string,
    @Body() d: TextDto,
    @Req() r: Request,
  ) {
    return this.service.addAddendum(p, id, d.text, ctx(r));
  }
  @Post(':recordId/reopen') reopen(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('recordId', ParseUUIDPipe) id: string,
    @Body() d: ReasonDto,
    @Req() r: Request,
  ) {
    return this.service.reopen(p, id, d.reason, ctx(r));
  }
  @Post(':recordId/flag-late-result') late(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('recordId', ParseUUIDPipe) id: string,
    @Body() d: LateResultDto,
    @Req() r: Request,
  ) {
    return this.service.flagLateResult(p, id, d.description, ctx(r));
  }
}

@Controller({ path: 'medical-record/break-glass-grants', version: '1' })
export class MedicalRecordBreakGlassController {
  constructor(private readonly breakGlass: MedicalRecordBreakGlassService) {}
  @ApiOperation({ summary: '🆕 Mới trong v2.6 — Kết thúc quyền truy cập khẩn cấp (break-glass)' })
  @RequireIdempotencyKey()
  @Post(':grantId/end')
  end(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Req() r: Request,
  ) {
    return this.breakGlass.end(p, grantId, ctx(r));
  }
}

@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly service: MedicalRecordsService) {}
  @Post(':documentId/review') review(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('documentId', ParseUUIDPipe) id: string,
    @Req() r: Request,
  ) {
    return this.service.reviewDocument(p, id, ctx(r));
  }
  @Post(':documentId/flag-incorrect-link') flag(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('documentId', ParseUUIDPipe) id: string,
    @Body() d: ReasonDto,
    @Req() r: Request,
  ) {
    return this.service.flagDocument(p, id, d.reason, ctx(r));
  }
}
