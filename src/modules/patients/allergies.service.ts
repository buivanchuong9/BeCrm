import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { AppError, ForbiddenAppError } from '../../core/errors/app-error';
import {
  CreateAllergyDto,
  CorrectAllergyDto,
  EnterInErrorDto,
  AllergyKnowledgeAssessmentDto,
} from './dto/allergy.dto';
import { toAllergyDto } from './lifetime-medical-record.mapper';

// Roles allowed to clinically verify or correct allergy records.
const CLINICIAN_ROLES = new Set(['doctor', 'nurse', 'admin', 'staff']);

function isClinician(principal: AuthenticatedPrincipal): boolean {
  return principal.memberships.some((m) => CLINICIAN_ROLES.has(m.role));
}

@Injectable()
export class AllergiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertPatientExists(patientId: string) {
    const p = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, organizationId: true },
    });
    if (!p) throw new AppError('PATIENT_NOT_FOUND', 'Patient not found.', HttpStatus.NOT_FOUND);
    return p;
  }

  private async assertAllergyBelongsToPatient(allergyId: string, patientId: string) {
    const row = await this.prisma.allergyIntolerance.findUnique({ where: { id: allergyId } });
    if (!row || row.patientId !== patientId) {
      throw new AppError('ALLERGY_NOT_FOUND', 'Allergy not found.', HttpStatus.NOT_FOUND);
    }
    return row;
  }

  async list(_principal: AuthenticatedPrincipal, patientId: string) {
    await this.assertPatientExists(patientId);
    const rows = await this.prisma.allergyIntolerance.findMany({
      where: { patientId },
      orderBy: [{ active: 'desc' }, { recordedAt: 'desc' }],
    });
    return rows.map(toAllergyDto);
  }

  async create(principal: AuthenticatedPrincipal, patientId: string, dto: CreateAllergyDto) {
    const patient = await this.assertPatientExists(patientId);

    // Check for NKA conflict: if there is an existing NKA assessment, adding
    // a new allergy is a safety conflict. We record it anyway but emit a
    // conflict audit event so a clinician can reconcile.
    const nkaAssessment = await this.prisma.allergyKnowledgeAssessment.findFirst({
      where: { patientId, knowledgeState: 'no_known_allergies' },
      orderBy: { assessedAt: 'desc' },
    });

    const row = await this.prisma.allergyIntolerance.create({
      data: {
        patientId,
        organizationId: patient.organizationId,
        clinicLocationId: dto.clinicLocationId ?? null,
        encounterId: dto.encounterId ?? null,
        category: dto.category,
        substance: dto.substance,
        substanceCode: dto.substanceCode ?? null,
        reaction: dto.reaction ?? null,
        severity: dto.severity ?? null,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : null,
        note: dto.note ?? null,
        sourceType: 'patient_reported',
        verificationStatus: 'patient_reported',
        recordedByUserId: principal.userId,
      },
    });

    const auditAction = nkaAssessment ? 'allergy.created.nka_conflict' : 'allergy.created';

    await this.audit.write({
      actorId: principal.userId,
      action: auditAction,
      resourceType: 'allergy_intolerance',
      resourceId: row.id,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
    });

    return toAllergyDto(row);
  }

  async verify(principal: AuthenticatedPrincipal, patientId: string, allergyId: string) {
    // Patients cannot verify their own allergy records.
    if (!isClinician(principal)) {
      throw new ForbiddenAppError(
        'CLINICIAN_REQUIRED',
        'Only a clinician may verify an allergy record.',
      );
    }

    const patient = await this.assertPatientExists(patientId);
    const existing = await this.assertAllergyBelongsToPatient(allergyId, patientId);

    if (
      existing.verificationStatus === 'superseded' ||
      existing.verificationStatus === 'entered_in_error'
    ) {
      throw new AppError(
        'ALLERGY_IMMUTABLE',
        'This record has been superseded or marked entered-in-error and cannot be verified.',
        HttpStatus.CONFLICT,
      );
    }

    const prevStatus = existing.verificationStatus;
    const row = await this.prisma.allergyIntolerance.update({
      where: { id: allergyId },
      data: {
        verificationStatus: 'clinician_verified',
        verifiedByUserId: principal.userId,
        verifiedAt: new Date(),
        sourceType: 'clinical_assessment',
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'allergy.verified',
      resourceType: 'allergy_intolerance',
      resourceId: row.id,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
      beforeRedacted: { verificationStatus: prevStatus },
      afterRedacted: { verificationStatus: 'clinician_verified' },
    });

    return toAllergyDto(row);
  }

  /**
   * Clinician correction: creates a new record that supersedes the old one.
   * The old record becomes immutable (verificationStatus = 'superseded').
   * The new record references old.id via supersedesId.
   */
  async correct(
    principal: AuthenticatedPrincipal,
    patientId: string,
    allergyId: string,
    dto: CorrectAllergyDto,
  ) {
    if (!isClinician(principal)) {
      throw new ForbiddenAppError(
        'CLINICIAN_REQUIRED',
        'Only a clinician may correct an allergy record.',
      );
    }

    const patient = await this.assertPatientExists(patientId);
    const existing = await this.assertAllergyBelongsToPatient(allergyId, patientId);

    if (
      existing.verificationStatus === 'superseded' ||
      existing.verificationStatus === 'entered_in_error'
    ) {
      throw new AppError(
        'ALLERGY_IMMUTABLE',
        'This record has already been superseded or marked entered-in-error.',
        HttpStatus.CONFLICT,
      );
    }

    const [, newRow] = await this.prisma.$transaction([
      // Mark old record as superseded (immutable from this point)
      this.prisma.allergyIntolerance.update({
        where: { id: allergyId },
        data: { verificationStatus: 'superseded', active: false },
      }),
      // Create the corrected record referencing the old one
      this.prisma.allergyIntolerance.create({
        data: {
          patientId,
          organizationId: patient.organizationId,
          clinicLocationId: dto.clinicLocationId ?? existing.clinicLocationId,
          encounterId: dto.encounterId ?? existing.encounterId,
          category: dto.category ?? existing.category,
          substance: dto.substance ?? existing.substance,
          substanceCode:
            dto.substanceCode !== undefined ? dto.substanceCode : existing.substanceCode,
          reaction: dto.reaction !== undefined ? dto.reaction : existing.reaction,
          severity: dto.severity !== undefined ? dto.severity : existing.severity,
          onsetDate:
            dto.onsetDate !== undefined
              ? dto.onsetDate
                ? new Date(dto.onsetDate)
                : null
              : existing.onsetDate,
          note: dto.note !== undefined ? dto.note : existing.note,
          sourceType: 'clinical_assessment',
          verificationStatus: 'clinician_verified',
          recordedByUserId: principal.userId,
          verifiedByUserId: principal.userId,
          verifiedAt: new Date(),
          supersedesId: allergyId,
        },
      }),
    ]);

    await this.audit.write({
      actorId: principal.userId,
      action: 'allergy.corrected',
      resourceType: 'allergy_intolerance',
      resourceId: newRow.id,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
      reason: dto.reason,
      beforeRedacted: { allergyId },
      afterRedacted: { newAllergyId: newRow.id },
    });

    return toAllergyDto(newRow);
  }

  /**
   * Mark a record as entered-in-error. Requires a reason. The record is
   * made inactive and its verificationStatus is set to 'entered_in_error'.
   * The record remains queryable for audit purposes.
   */
  async enterInError(
    principal: AuthenticatedPrincipal,
    patientId: string,
    allergyId: string,
    dto: EnterInErrorDto,
  ) {
    if (!isClinician(principal)) {
      throw new ForbiddenAppError(
        'CLINICIAN_REQUIRED',
        'Only a clinician may mark a record as entered-in-error.',
      );
    }

    const patient = await this.assertPatientExists(patientId);
    const existing = await this.assertAllergyBelongsToPatient(allergyId, patientId);

    if (
      existing.verificationStatus === 'superseded' ||
      existing.verificationStatus === 'entered_in_error'
    ) {
      throw new AppError(
        'ALLERGY_ALREADY_RESOLVED',
        'This record has already been superseded or marked entered-in-error.',
        HttpStatus.CONFLICT,
      );
    }

    const row = await this.prisma.allergyIntolerance.update({
      where: { id: allergyId },
      data: {
        verificationStatus: 'entered_in_error',
        active: false,
        enteredInErrorAt: new Date(),
        enteredInErrorByUserId: principal.userId,
        note: dto.reason,
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'allergy.entered_in_error',
      resourceType: 'allergy_intolerance',
      resourceId: row.id,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
      reason: dto.reason,
    });

    return toAllergyDto(row);
  }

  /**
   * Record an explicit allergy knowledge state assessment.
   * - NO_KNOWN_ALLERGIES requires a clinician.
   * - Adding a known allergy after an NKA assessment creates a conflict event.
   */
  async assessKnowledgeState(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: AllergyKnowledgeAssessmentDto,
  ) {
    if (dto.knowledgeState === 'no_known_allergies' || dto.knowledgeState === 'known_allergies') {
      if (!isClinician(principal)) {
        throw new ForbiddenAppError(
          'CLINICIAN_REQUIRED',
          'Only a clinician may assess allergy knowledge state.',
        );
      }
    }

    const patient = await this.assertPatientExists(patientId);

    // Safety check: recording NKA when verified allergies exist is a conflict.
    if (dto.knowledgeState === 'no_known_allergies') {
      const activeVerified = await this.prisma.allergyIntolerance.count({
        where: {
          patientId,
          active: true,
          verificationStatus: 'clinician_verified',
        },
      });
      if (activeVerified > 0) {
        throw new AppError(
          'NKA_CONFLICT',
          'Cannot record No Known Allergies — active clinician-verified allergies exist for this patient.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const assessment = await this.prisma.allergyKnowledgeAssessment.create({
      data: {
        patientId,
        organizationId: patient.organizationId,
        clinicLocationId: dto.clinicLocationId ?? null,
        encounterId: dto.encounterId ?? null,
        knowledgeState: dto.knowledgeState,
        assessedByUserId: principal.userId,
        note: dto.note ?? null,
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'allergy.knowledge_state_assessed',
      resourceType: 'allergy_knowledge_assessment',
      resourceId: assessment.id,
      patientId,
      organizationId: patient.organizationId,
      result: 'success',
      afterRedacted: { knowledgeState: dto.knowledgeState },
    });

    return {
      id: assessment.id,
      knowledgeState: assessment.knowledgeState,
      assessedAt: assessment.assessedAt.toISOString(),
      assessedByUserId: assessment.assessedByUserId,
      organizationId: assessment.organizationId,
    };
  }
}
