import { ApiProperty } from '@nestjs/swagger';
import { LIFETIME_RECORD_EVENT_TYPES } from '../lifetime-medical-record-query.dto';

export class LifetimeRecordPatientDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true }) nationalHealthId!: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'date', nullable: true }) dob!: string | null;
  @ApiProperty() gender!: string;
  @ApiProperty() bloodType!: string;
}

export class LifetimeRecordClinicalItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true }) code!: string | null;
  @ApiProperty() display!: string;
  @ApiProperty({ nullable: true }) status!: string | null;
  @ApiProperty({ nullable: true }) value!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
}

export class LifetimeRecordSummaryDto {
  @ApiProperty() encounterCount!: number;
  @ApiProperty() organizationCount!: number;
  @ApiProperty() facilityCount!: number;
  @ApiProperty({ format: 'date-time', nullable: true }) firstRecordedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) lastRecordedAt!: string | null;
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  activeConditions!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  allergies!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  currentMedications!: LifetimeRecordClinicalItemDto[];
}

export class LifetimeRecordSourceDto {
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) facilityId!: string | null;
  @ApiProperty({ nullable: true }) facilityName!: string | null;
  @ApiProperty({ nullable: true }) province!: string | null;
  @ApiProperty({ nullable: true }) system!: string | null;
}

export class LifetimeRecordDocumentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) contentType!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) signedAt!: string | null;
  @ApiProperty({ nullable: true }) downloadUrl!: string | null;
}

export class LifetimeRecordProvenanceDto {
  @ApiProperty() sourceRecordId!: string;
  @ApiProperty({ nullable: true }) sourceSystem!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) importedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) lastVerifiedAt!: string | null;
  @ApiProperty({ nullable: true }) integrityHash!: string | null;
}

export class LifetimeRecordEventDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true }) endedAt!: string | null;
  @ApiProperty({ enum: LIFETIME_RECORD_EVENT_TYPES }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) summary!: string | null;
  @ApiProperty({ nullable: true }) status!: string | null;
  @ApiProperty({ nullable: true }) specialty!: string | null;
  @ApiProperty({ nullable: true }) practitionerName!: string | null;
  @ApiProperty({ type: LifetimeRecordSourceDto }) source!: LifetimeRecordSourceDto;
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  diagnoses!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  medications!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  orders!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  results!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordClinicalItemDto, isArray: true })
  procedures!: LifetimeRecordClinicalItemDto[];
  @ApiProperty({ type: LifetimeRecordDocumentDto, isArray: true })
  documents!: LifetimeRecordDocumentDto[];
  @ApiProperty({ type: LifetimeRecordProvenanceDto }) provenance!: LifetimeRecordProvenanceDto;
}

export class LifetimeMedicalRecordResponseDto {
  @ApiProperty({ type: LifetimeRecordPatientDto }) patient!: LifetimeRecordPatientDto;
  @ApiProperty({ type: LifetimeRecordSummaryDto }) summary!: LifetimeRecordSummaryDto;
  @ApiProperty({ type: LifetimeRecordEventDto, isArray: true }) events!: LifetimeRecordEventDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ format: 'date-time' }) synchronizedAt!: string;
}
