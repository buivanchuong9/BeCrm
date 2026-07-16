import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../common/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';
import { canTransition } from '../encounters/encounter-state-machine';
import { AiAssessmentRepository } from '../ai-assessment/ai-assessment.repository';
import { CandidateCondition } from '../ai-assessment/ai-scoring.util';
import { DoctorDecisionRepository } from './doctor-decision.repository';
import {
  toClinicalPlanResponse,
  toDoctorDiagnosisResponse,
  toDoctorReviewResponse,
} from './doctor-decision-response.mapper';
import { ReviewAssessmentRequest } from './dto/review-assessment.dto';
import { RecordDiagnosisRequest } from './dto/record-diagnosis.dto';
import { ReviseDiagnosisRequest } from './dto/revise-diagnosis.dto';
import { ApproveClinicalPlanRequest } from './dto/approve-clinical-plan.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

/** docs/api.md section 25: "This is the ONLY module permitted to write
 * DoctorReview / DoctorDiagnosis / ClinicalPlan records" — every public
 * method here asserts `doctor` (never medical_administrator override; a
 * super_administrator bypass is intentionally NOT applied to clinical
 * authorship, per docs section 4 principle 6 / section 7.6). */
function assertDoctor(principal: AuthenticatedPrincipal): void {
  if (!principal.memberships.some((m) => m.role === 'doctor')) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Only a doctor may perform this action.');
  }
}

@Injectable()
export class DoctorDecisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DoctorDecisionRepository,
    private readonly encounters: EncountersRepository,
    private readonly aiAssessments: AiAssessmentRepository,
    private readonly audit: AuditService,
  ) {}

  private async loadEncounter(principal: AuthenticatedPrincipal, encounterId: string) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    return encounter;
  }

  async reviewAssessment(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    aiAssessmentId: string,
    dto: ReviewAssessmentRequest,
    context: RequestContext,
  ) {
    assertDoctor(principal);
    const encounter = await this.loadEncounter(principal, encounterId);
    const assessment = await this.aiAssessments.findById(aiAssessmentId);
    if (!assessment || assessment.encounterId !== encounterId) {
      throw new NotFoundAppError('AI assessment not found.');
    }

    // docs/api.md DX-1: rationale is required if the action isn't a plain
    // accept, or if the doctor's accepted condition disagrees with the AI's
    // top-ranked candidate — confirmed verbatim frontend business rule.
    const candidates = assessment.candidateConditions as unknown as CandidateCondition[];
    const topRanked = candidates[0]?.code;
    const disagreesWithTop =
      dto.action === 'accepted' &&
      dto.acceptedConditionCode !== undefined &&
      dto.acceptedConditionCode !== topRanked;
    if ((dto.action !== 'accepted' || disagreesWithTop) && !dto.rationale) {
      throw new ValidationAppError(
        [{ field: 'rationale', code: 'REQUIRED' }],
        "A rationale is required when overriding the AI's top-ranked condition.",
      );
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.createReview(tx, {
        encounterId,
        aiAssessmentId,
        doctorId: principal.userId,
        action: dto.action,
        acceptedConditionCode: dto.acceptedConditionCode ?? null,
        rationale: dto.rationale ?? null,
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'doctor_review.recorded',
          resourceType: 'doctor_review',
          resourceId: created.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toDoctorReviewResponse(review) };
  }

  async listReviews(principal: AuthenticatedPrincipal, encounterId: string) {
    await this.loadEncounter(principal, encounterId);
    const rows = await this.repo.listReviews(encounterId);
    return { data: rows.map(toDoctorReviewResponse) };
  }

  async recordDiagnosis(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: RecordDiagnosisRequest,
    context: RequestContext,
  ) {
    assertDoctor(principal);
    const encounter = await this.loadEncounter(principal, encounterId);

    const shouldTransition =
      dto.status === 'confirmed' && canTransition(encounter.status, 'diagnosed');

    const diagnosis = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.createDiagnosis(tx, {
        encounterId,
        doctorId: principal.userId,
        status: dto.status,
        conditionName: dto.conditionName,
        conditionCode: dto.conditionCode ?? null,
        aiAssessmentId: dto.aiAssessmentId ?? null,
        isAdditionalToAI: dto.isAdditionalToAI,
        rationale: dto.rationale ?? null,
      });

      if (shouldTransition) {
        await tx.medicalEncounter.update({
          where: { id: encounterId },
          data: { status: 'diagnosed', version: { increment: 1 } },
        });
        await this.encounters.addEvent(
          tx,
          encounterId,
          `Chẩn đoán xác nhận: ${dto.conditionName}`,
          'success',
        );
      }

      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'doctor_diagnosis.recorded',
          resourceType: 'doctor_diagnosis',
          resourceId: created.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toDoctorDiagnosisResponse(diagnosis) };
  }

  async listDiagnoses(principal: AuthenticatedPrincipal, encounterId: string) {
    await this.loadEncounter(principal, encounterId);
    const rows = await this.repo.listDiagnoses(encounterId);
    return { data: rows.map(toDoctorDiagnosisResponse) };
  }

  /** docs/api.md DX-5 / section 41 "Diagnosis revision": append-only — the
   * prior row is marked `revised`, never edited beyond that status flip, and
   * a brand-new row is inserted with `revisionOfId` pointing back to it. */
  async reviseDiagnosis(
    principal: AuthenticatedPrincipal,
    diagnosisId: string,
    dto: ReviseDiagnosisRequest,
    context: RequestContext,
  ) {
    assertDoctor(principal);
    const prior = await this.repo.findDiagnosisById(diagnosisId);
    if (!prior) {
      throw new NotFoundAppError('Diagnosis not found.');
    }
    const encounter = await this.loadEncounter(principal, prior.encounterId);

    const revised = await this.prisma.$transaction(async (tx) => {
      const markResult = await tx.doctorDiagnosis.updateMany({
        where: { id: diagnosisId, status: { not: 'revised' } },
        data: { status: 'revised' },
      });
      if (markResult.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'This diagnosis has already been revised.',
        );
      }
      const created = await this.repo.createDiagnosis(tx, {
        encounterId: prior.encounterId,
        doctorId: principal.userId,
        status: 'confirmed',
        conditionName: dto.conditionName,
        conditionCode: prior.conditionCode,
        aiAssessmentId: prior.aiAssessmentId,
        isAdditionalToAI: prior.isAdditionalToAI,
        rationale: dto.rationale,
        revisionOfId: diagnosisId,
      });
      await this.encounters.addEvent(
        tx,
        prior.encounterId,
        `Chẩn đoán được điều chỉnh: ${dto.conditionName}`,
        'warning',
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'doctor_diagnosis.revised',
          resourceType: 'doctor_diagnosis',
          resourceId: created.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          reason: dto.rationale,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toDoctorDiagnosisResponse(revised) };
  }

  /**
   * docs/api.md DX-6: creates the plan, transitions diagnosed -> plan_approved.
   * Workflow auto-activation (docs section 25 "if the encounter has no
   * workflowInstanceId yet... auto-activate it") is wired in from the
   * Workflow module once that module exists — WorkflowActivationService
   * listens for this via ClinicalPlanApprovedHook, kept as a thin optional
   * dependency here so this module never has to import Workflow directly.
   */
  async approveClinicalPlan(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: ApproveClinicalPlanRequest,
    context: RequestContext,
  ) {
    assertDoctor(principal);
    const encounter = await this.loadEncounter(principal, encounterId);
    const diagnosis = await this.repo.findDiagnosisById(dto.diagnosisId);
    if (!diagnosis || diagnosis.encounterId !== encounterId) {
      throw new NotFoundAppError('Diagnosis not found.');
    }
    if (diagnosis.status !== 'confirmed' && diagnosis.status !== 'revised') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        'A clinical plan requires a confirmed diagnosis.',
      );
    }
    if (!canTransition(encounter.status, 'plan_approved')) {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        `Cannot approve a clinical plan while the encounter is "${encounter.status}".`,
      );
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.createClinicalPlan(tx, {
        encounterId,
        doctorId: principal.userId,
        diagnosisId: dto.diagnosisId,
        summary: dto.summary,
      });
      await tx.medicalEncounter.update({
        where: { id: encounterId },
        data: { status: 'plan_approved', version: { increment: 1 } },
      });
      await this.encounters.addEvent(tx, encounterId, 'Phác đồ điều trị đã được duyệt', 'success');
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'clinical_plan.approved',
          resourceType: 'clinical_plan',
          resourceId: created.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toClinicalPlanResponse(plan) };
  }

  async getClinicalPlan(principal: AuthenticatedPrincipal, encounterId: string) {
    await this.loadEncounter(principal, encounterId);
    const plan = await this.repo.findClinicalPlanByEncounterId(encounterId);
    if (!plan) {
      throw new NotFoundAppError('Clinical plan not found.');
    }
    return { data: toClinicalPlanResponse(plan) };
  }
}
