import { ApiProperty } from '@nestjs/swagger';
import { LIFETIME_RECORD_EVENT_TYPES } from '../lifetime-medical-record-query.dto';

const ALLERGY_KNOWLEDGE_STATE_VALUES = [
  'unknown',
  'no_known_allergies',
  'known_allergies',
] as const;
const ALLERGY_VERIFICATION_VALUES = [
  'patient_reported',
  'clinician_verified',
  'unverified',
  'imported_unverified',
  'organization_verified',
  'superseded',
  'entered_in_error',
] as const;
const ALLERGY_SOURCE_VALUES = [
  'patient_reported',
  'clinical_assessment',
  'imported_unverified',
  'legacy_backfill',
] as const;
const VITAL_SOURCE_VALUES = [
  'clinical_measurement',
  'patient_reported',
  'device_imported',
  'ehr_imported',
  'legacy_backfill',
] as const;

export class LifetimeRecordPatientDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true }) nationalHealthId!: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'date', nullable: true }) dob!: string | null;
  @ApiProperty() gender!: string;
  @ApiProperty() bloodType!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty({ nullable: true }) heightCm!: number | null;
  @ApiProperty({ nullable: true }) weightKg!: number | null;
}

export class AllergyKnowledgeStateDto {
  @ApiProperty({ enum: ALLERGY_KNOWLEDGE_STATE_VALUES })
  state!: (typeof ALLERGY_KNOWLEDGE_STATE_VALUES)[number];
  @ApiProperty({ format: 'date-time', nullable: true }) assessedAt!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) assessedByUserId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) organizationId!: string | null;
}

export class AllergyIntoleranceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() substance!: string;
  @ApiProperty({ nullable: true }) substanceCode!: string | null;
  @ApiProperty() category!: string;
  @ApiProperty({ nullable: true }) reaction!: string | null;
  @ApiProperty({ nullable: true }) severity!: string | null;
  @ApiProperty({ format: 'date', nullable: true }) onsetDate!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) effectiveAt!: string | null;
  @ApiProperty({ enum: ALLERGY_VERIFICATION_VALUES }) verificationStatus!: string;
  @ApiProperty({ nullable: true }) verifiedAt!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) verifiedByUserId!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
  @ApiProperty({ enum: ALLERGY_SOURCE_VALUES }) sourceType!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) clinicLocationId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) encounterId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) supersedesId!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) enteredInErrorAt!: string | null;
}

export class VitalObservationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() value!: number;
  @ApiProperty() unit!: string;
  @ApiProperty({ format: 'date-time' }) observedAt!: string;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
  @ApiProperty({ enum: VITAL_SOURCE_VALUES }) sourceType!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) clinicLocationId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) encounterId!: string | null;
  @ApiProperty({ nullable: true }) method!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) bmiSourceHeightId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) bmiSourceWeightId!: string | null;
}

export class PatientProfileNarrativeDto {
  @ApiProperty({ nullable: true }) chiefComplaint!: string | null;
  @ApiProperty({ nullable: true }) medicalHistory!: string | null;
  @ApiProperty({ nullable: true }) familyHistory!: string | null;
  @ApiProperty({ nullable: true }) socialHistory!: string | null;
  @ApiProperty({ nullable: true }) currentSymptoms!: string | null;
  @ApiProperty({ nullable: true }) lifestyle!: string | null;
  @ApiProperty({ nullable: true }) occupation!: string | null;
  @ApiProperty({ nullable: true }) surgicalHistory!: string | null;
  @ApiProperty({ nullable: true }) vaccinationNotes!: string | null;
  @ApiProperty() isPatientProvided!: boolean;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProblemListEntryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() conditionName!: string;
  @ApiProperty({ nullable: true }) conditionCode!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'date', nullable: true }) onsetDate!: string | null;
  @ApiProperty({ nullable: true }) severity!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty({ format: 'uuid' }) addedByUserId!: string;
  @ApiProperty({ nullable: true }) addedByName!: string | null;
  @ApiProperty({ format: 'date-time' }) addedAt!: string;
}

export class CurrentMedicationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() medicationName!: string;
  @ApiProperty({ nullable: true }) dosage!: string | null;
  @ApiProperty({ nullable: true }) frequency!: string | null;
  @ApiProperty({ nullable: true }) route!: string | null;
  @ApiProperty({ format: 'date', nullable: true }) startedAt!: string | null;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty({ format: 'uuid' }) addedByUserId!: string;
  @ApiProperty({ nullable: true }) addedByName!: string | null;
  @ApiProperty({ format: 'date-time' }) addedAt!: string;
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
  @ApiProperty({ type: AllergyKnowledgeStateDto })
  allergyKnowledgeState!: AllergyKnowledgeStateDto;
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
  @ApiProperty({ type: AllergyIntoleranceDto, isArray: true }) allergies!: AllergyIntoleranceDto[];
  @ApiProperty({ type: VitalObservationDto, isArray: true }) vitals!: VitalObservationDto[];
  @ApiProperty({ type: PatientProfileNarrativeDto, nullable: true })
  narrative!: PatientProfileNarrativeDto | null;
  @ApiProperty({ type: ProblemListEntryDto, isArray: true }) problemList!: ProblemListEntryDto[];
  @ApiProperty({ type: CurrentMedicationDto, isArray: true })
  currentMedications!: CurrentMedicationDto[];
  @ApiProperty({ type: LifetimeRecordEventDto, isArray: true }) events!: LifetimeRecordEventDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ format: 'date-time' }) synchronizedAt!: string;
}
