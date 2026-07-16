import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequireIdempotencyKey } from '../../common/idempotency/idempotency-key.decorator';
import { MedicalRecordsService } from './medical-records.service';

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
  @IsString() type!: string;
  @IsUUID() fileId!: string;
  @IsOptional() @IsUUID() workflowTaskId?: string;
  @IsOptional() @IsUUID() clinicalOrderId?: string;
}
class ReasonDto {
  @IsString() reason!: string;
}
class TextDto {
  @IsString() text!: string;
}
class LateResultDto {
  @IsString() description!: string;
}

@Controller({ path: 'encounters', version: '1' })
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}
  @Get(':encounterId/medical-record') get(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
  ) {
    return this.service.ensureDraft(p, id);
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
