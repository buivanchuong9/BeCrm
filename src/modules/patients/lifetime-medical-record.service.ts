import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { AppError } from '../../core/errors/app-error';
import { LifetimeMedicalRecordQuery } from './dto/lifetime-medical-record-query.dto';
import { UpdateNarrativeDto } from './dto/update-narrative.dto';
import { CreateProblemEntryDto, UpdateProblemEntryDto } from './dto/create-problem-entry.dto';
import { CreateCurrentMedicationDto, UpdateCurrentMedicationDto } from './dto/create-current-medication.dto';
import { LifetimeRecordEventDto } from './dto/responses/lifetime-medical-record-response.dto';
import { LifetimeMedicalRecordRepository } from './lifetime-medical-record.repository';
import { assertCanViewLifetimeRecord } from './policies/lifetime-medical-record-policies';
import {
  buildAllergyKnowledgeStateDto,
  buildEvents,
  buildSummary,
  collectDoctorIds,
  toAllergyDto,
  toCurrentMedicationDto,
  toNarrativeDto,
  toPatientDto,
  toProblemListEntryDto,
  toVitalDto,
} from './lifetime-medical-record.mapper';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class LifetimeMedicalRecordService {
  constructor(
    private readonly repo: LifetimeMedicalRecordRepository,
    private readonly audit: AuditService,
  ) {}

  async get(
    principal: AuthenticatedPrincipal,
    patientId: string,
    query: LifetimeMedicalRecordQuery,
    context: RequestContext,
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) {
      throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    }

    // Unlike patients.repository.ts's findVisibleById (which hides a
    // caller-invisible patient behind a 404), LIFETIME_MEDICAL_RECORD_API.md
    // section 7 defines a distinct 403 RECORD_ACCESS_DENIED — insufficient
    // scope is reported explicitly rather than obscured as "not found".
    const hasActiveDoctorRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));

    try {
      assertCanViewLifetimeRecord(principal, patient, hasActiveDoctorRelationship);
    } catch (err) {
      await this.audit.write({
        actorId: principal.userId,
        action: 'lifetime_medical_record.read',
        resourceType: 'patient',
        resourceId: patientId,
        patientId,
        organizationId: patient.organizationId,
        result: 'denied',
        requestId: context.requestId ?? null,
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw err;
    }

    if (query.from && query.to && new Date(query.from).getTime() > new Date(query.to).getTime()) {
      throw new AppError(
        'INVALID_FILTER',
        '`from` must not be after `to`.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encounters = await this.repo.findEncountersForPatient(patientId);
    const encounterIds = encounters.map((e) => e.id);
    const [prescriptions, documents, allergies, vitals, narrative, latestKnowledgeAssessment, problemList, currentMedications] =
      await Promise.all([
        this.repo.findPrescriptions(encounterIds),
        this.repo.findDocuments(encounterIds),
        this.repo.findAllergies(patientId),
        this.repo.findVitalObservations(patientId),
        this.repo.findProfileNarrative(patientId),
        this.repo.findLatestAllergyKnowledgeAssessment(patientId),
        this.repo.findProblemList(patientId),
        this.repo.findCurrentMedications(patientId),
      ]);
    const userNames = await this.repo.findUserNames(
      collectDoctorIds(encounters, prescriptions, documents),
    );

    const allergyKnowledgeState = buildAllergyKnowledgeStateDto(latestKnowledgeAssessment);

    // Summary/patient/counts are always computed from the full,
    // unfiltered record (matches the frontend's always-visible stat tiles
    // in LifetimeMedicalRecord.tsx); only the returned `events` page
    // respects the query filters below.
    const summary = buildSummary(encounters, prescriptions, allergies, allergyKnowledgeState);
    const allEvents = buildEvents(encounters, prescriptions, documents, userNames);

    const filtered = this.applyFilters(allEvents, query).sort((a, b) =>
      a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0,
    );

    const total = filtered.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const pageEvents = filtered.slice(start, start + limit);

    await this.audit.write({
      actorId: principal.userId,
      action: 'lifetime_medical_record.read',
      resourceType: 'patient',
      resourceId: patientId,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return {
      data: {
        patient: toPatientDto(patient),
        summary,
        allergies: allergies.map(toAllergyDto),
        vitals: vitals.map(toVitalDto),
        narrative: toNarrativeDto(narrative),
        problemList: problemList.map(toProblemListEntryDto),
        currentMedications: currentMedications.map(toCurrentMedicationDto),
        events: pageEvents,
        page,
        limit,
        total,
        synchronizedAt: new Date().toISOString(),
      },
    };
  }

  async upsertNarrative(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: UpdateNarrativeDto,
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);

    const hasActiveDoctorRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));
    const { assertCanViewLifetimeRecord } = await import('./policies/lifetime-medical-record-policies');
    assertCanViewLifetimeRecord(principal, patient, hasActiveDoctorRelationship);

    const row = await this.repo.upsertNarrative(patientId, patient.organizationId, dto, principal.userId);

    await this.audit.write({
      actorId: principal.userId,
      action: 'patient_narrative.updated',
      resourceType: 'patient_profile_narrative',
      resourceId: patientId,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
    });

    return { data: toNarrativeDto(row) };
  }

  async addProblemEntry(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateProblemEntryDto,
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    const hasRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));
    assertCanViewLifetimeRecord(principal, patient, hasRelationship);

    const row = await this.repo.createProblemEntry(patientId, patient.organizationId, principal.userId, dto);
    return { data: toProblemListEntryDto(row) };
  }

  async updateProblemEntry(
    principal: AuthenticatedPrincipal,
    patientId: string,
    entryId: string,
    dto: UpdateProblemEntryDto,
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    const entry = await this.repo.findProblemEntry(entryId);
    if (!entry || entry.patientId !== patientId)
      throw new AppError('NOT_FOUND', 'Problem list entry not found.', HttpStatus.NOT_FOUND);
    const hasRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));
    assertCanViewLifetimeRecord(principal, patient, hasRelationship);

    const row = await this.repo.updateProblemEntry(entryId, dto);
    return { data: toProblemListEntryDto(row) };
  }

  async addCurrentMedication(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateCurrentMedicationDto,
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    const hasRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));
    assertCanViewLifetimeRecord(principal, patient, hasRelationship);

    const row = await this.repo.createCurrentMedication(patientId, patient.organizationId, principal.userId, dto);
    return { data: toCurrentMedicationDto(row) };
  }

  async updateCurrentMedication(
    principal: AuthenticatedPrincipal,
    patientId: string,
    medicationId: string,
    dto: UpdateCurrentMedicationDto & { active?: boolean },
  ) {
    const patient = await this.repo.findPatientCore(patientId);
    if (!patient) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    const med = await this.repo.findCurrentMedication(medicationId);
    if (!med || med.patientId !== patientId)
      throw new AppError('NOT_FOUND', 'Medication not found.', HttpStatus.NOT_FOUND);
    const hasRelationship =
      patient.primaryDoctorId === principal.userId ||
      (await this.repo.hasActiveCareTeamRow(patientId, principal.userId));
    assertCanViewLifetimeRecord(principal, patient, hasRelationship);

    const row = await this.repo.updateCurrentMedication(medicationId, dto);
    return { data: toCurrentMedicationDto(row) };
  }

  // In-memory filter/sort/paginate over the full per-patient event set.
  // Fine at today's per-patient encounter volumes; the spec's P95 <1s @
  // 10k-events target (section 8) is explicitly deferred until this needs
  // a materialized `lifetime_record_events` index/cache (section 6).
  private applyFilters(
    events: LifetimeRecordEventDto[],
    query: LifetimeMedicalRecordQuery,
  ): LifetimeRecordEventDto[] {
    const from = query.from ? new Date(query.from).getTime() : null;
    const to = query.to ? new Date(query.to).getTime() : null;
    const search = query.search?.trim().toLowerCase();

    return events.filter((event) => {
      if (query.type && event.type !== query.type) return false;
      if (query.organizationId && event.source.organizationId !== query.organizationId) {
        return false;
      }
      if (query.facilityId && event.source.facilityId !== query.facilityId) return false;
      const occurredAtMs = new Date(event.occurredAt).getTime();
      if (from !== null && occurredAtMs < from) return false;
      if (to !== null && occurredAtMs > to) return false;
      if (search && !this.matchesSearch(event, search)) return false;
      return true;
    });
  }

  private matchesSearch(event: LifetimeRecordEventDto, search: string): boolean {
    const haystack = [
      event.title,
      event.summary,
      event.practitionerName,
      event.source.organizationName,
      event.source.facilityName,
      ...event.diagnoses.map((d) => d.display),
      ...event.medications.map((m) => m.display),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  }
}
