import { Injectable } from '@nestjs/common';
import { Prisma, type EncounterStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';
import { canTransition } from '../encounters/encounter-state-machine';
import { AiAssessmentRepository } from '../ai-assessment/ai-assessment.repository';
import { CandidateCondition } from '../ai-assessment/ai-scoring.util';
import { DoctorDecisionRepository } from './doctor-decision.repository';
import {
  toClinicalPlanResponse,
  toClinicalPlanRevisionResponse,
  toDoctorDiagnosisResponse,
  toDoctorReviewResponse,
} from './doctor-decision-response.mapper';
import { ReviewAssessmentRequest } from './dto/review-assessment.dto';
import { RecordDiagnosisRequest } from './dto/record-diagnosis.dto';
import { ReviseDiagnosisRequest } from './dto/revise-diagnosis.dto';
import {
  ApproveClinicalPlanRequest,
  ReviseClinicalPlanRequest,
} from './dto/approve-clinical-plan.dto';

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

/**
 * A doctor-facing command may start directly from the AI result screen. Keep
 * the canonical state-machine edges intact while composing that user action
 * into the shortest valid path to a confirmed diagnosis.
 */
function pathToDiagnosed(from: EncounterStatus): EncounterStatus[] | undefined {
  const paths: Partial<Record<EncounterStatus, EncounterStatus[]>> = {
    intake_complete: ['under_doctor_review', 'diagnosed'],
    ai_assessed: ['under_doctor_review', 'diagnosed'],
    checked_in: ['under_doctor_review', 'diagnosed'],
    escalated: ['under_doctor_review', 'diagnosed'],
    under_doctor_review: ['diagnosed'],
    awaiting_results: ['diagnosed'],
    diagnosed: [],
  };
  const path = paths[from];
  if (!path) return undefined;

  let current = from;
  for (const next of path) {
    if (!canTransition(current, next)) return undefined;
    current = next;
  }
  return path;
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

    const diagnosisPath =
      dto.status === 'confirmed' ? pathToDiagnosed(encounter.status) : undefined;
    const shouldTransition = Boolean(diagnosisPath?.length);

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
        const result = await tx.medicalEncounter.updateMany({
          where: { id: encounterId, version: encounter.version },
          data: { status: 'diagnosed', version: { increment: 1 } },
        });
        if (result.count === 0) {
          throw new ConflictAppError(
            'OPTIMISTIC_LOCK_FAILED',
            'The encounter was modified by another request.',
          );
        }
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
    const diagnosisPath = pathToDiagnosed(encounter.status);
    const canApprove = diagnosisPath !== undefined && canTransition('diagnosed', 'plan_approved');
    if (!canApprove) {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        `Cannot approve a clinical plan while the encounter is "${encounter.status}".`,
      );
    }

    if (dto.protocolRef) {
      const protocolVersion = await this.prisma.workflowTemplateVersion.findFirst({
        where: {
          id: dto.protocolRef.templateVersionId,
          templateId: dto.protocolRef.templateId,
          status: 'published',
        },
      });
      if (!protocolVersion) {
        throw new ValidationAppError(
          [{ field: 'protocolRef', code: 'INVALID_PUBLISHED_VERSION' }],
          'The care plan must reference a published version of the selected protocol.',
        );
      }
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const signedAt = new Date();
      const created = await this.repo.createClinicalPlan(tx, {
        encounterId,
        doctorId: principal.userId,
        diagnosisId: dto.diagnosisId,
        summary: dto.summary,
        measurableGoals:
          dto.measurableGoals && dto.measurableGoals.length > 0
            ? dto.measurableGoals
            : [dto.summary],
        protocolTemplateId: dto.protocolRef?.templateId,
        protocolTemplateVersionId: dto.protocolRef?.templateVersionId,
        milestones: (dto.milestones ?? []) as unknown as Prisma.InputJsonValue,
        monitoringMetrics: dto.monitoringMetrics ?? [],
        stopOrChangeCriteria: dto.stopOrChangeCriteria ?? '',
        contraindications: dto.contraindications ?? [],
        prerequisites: dto.prerequisites ?? [],
        responsibleProviderId: principal.userId,
        deviationFromProtocol: dto.deviationFromProtocol
          ? {
              reason: dto.deviationFromProtocol.reason,
              approvedBy: principal.userId,
              approvedAt: signedAt.toISOString(),
            }
          : undefined,
        outcome: dto.outcome,
        currentStage: dto.currentStage ?? 'induction',
        signedBy: principal.userId,
        signedAt,
      });
      await tx.clinicalPlanRevision.create({
        data: {
          planId: created.id,
          version: created.version,
          action: 'approved',
          actorId: principal.userId,
          snapshot: {
            id: created.id,
            encounterId: created.encounterId,
            diagnosisId: created.diagnosisId,
            summary: created.summary,
            measurableGoals: created.measurableGoals,
            protocolRef:
              created.protocolTemplateId && created.protocolTemplateVersionId
                ? {
                    templateId: created.protocolTemplateId,
                    templateVersionId: created.protocolTemplateVersionId,
                  }
                : null,
            milestones: created.milestones,
            monitoringMetrics: created.monitoringMetrics,
            stopOrChangeCriteria: created.stopOrChangeCriteria,
            contraindications: created.contraindications,
            prerequisites: created.prerequisites,
            responsibleProviderId: created.responsibleProviderId,
            deviationFromProtocol: created.deviationFromProtocol,
            outcome: created.outcome,
            currentStage: created.currentStage,
            signedBy: created.signedBy,
            signedAt: created.signedAt?.toISOString() ?? null,
          },
        },
      });
      const encounterUpdate = await tx.medicalEncounter.updateMany({
        where: { id: encounterId, version: encounter.version },
        data: { status: 'plan_approved', version: { increment: 1 } },
      });
      if (encounterUpdate.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The encounter was modified by another request.',
        );
      }
      if (diagnosisPath.length > 0) {
        await this.encounters.addEvent(
          tx,
          encounterId,
          'Trạng thái lượt khám được đồng bộ theo chẩn đoán đã xác nhận',
          'info',
        );
      }
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

  async reviseClinicalPlan(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: ReviseClinicalPlanRequest,
    context: RequestContext,
  ) {
    assertDoctor(principal);
    const encounter = await this.loadEncounter(principal, encounterId);
    const current = await this.repo.findClinicalPlanByEncounterId(encounterId);
    if (!current) {
      throw new NotFoundAppError('Clinical plan not found.');
    }
    const hasMaterialChange = [
      dto.summary,
      dto.measurableGoals,
      dto.protocolRef,
      dto.milestones,
      dto.monitoringMetrics,
      dto.stopOrChangeCriteria,
      dto.contraindications,
      dto.prerequisites,
      dto.deviationFromProtocol,
      dto.outcome,
      dto.currentStage,
    ].some((value) => value !== undefined);
    if (!hasMaterialChange) {
      throw new ValidationAppError(
        [{ field: 'body', code: 'NO_MATERIAL_CHANGE' }],
        'At least one care-plan field must change.',
      );
    }
    if (dto.protocolRef) {
      const protocolVersion = await this.prisma.workflowTemplateVersion.findFirst({
        where: {
          id: dto.protocolRef.templateVersionId,
          templateId: dto.protocolRef.templateId,
          status: 'published',
        },
      });
      if (!protocolVersion) {
        throw new ValidationAppError(
          [{ field: 'protocolRef', code: 'INVALID_PUBLISHED_VERSION' }],
          'The care plan must reference a published version of the selected protocol.',
        );
      }
    }

    const revised = await this.prisma.$transaction(async (tx) => {
      const signedAt = new Date();
      const updated = await tx.clinicalPlan.updateMany({
        where: { id: current.id, version: dto.version },
        data: {
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(dto.measurableGoals !== undefined ? { measurableGoals: dto.measurableGoals } : {}),
          ...(dto.protocolRef
            ? {
                protocolTemplateId: dto.protocolRef.templateId,
                protocolTemplateVersionId: dto.protocolRef.templateVersionId,
              }
            : {}),
          ...(dto.milestones !== undefined
            ? {
                milestones: dto.milestones as unknown as Prisma.InputJsonValue,
              }
            : {}),
          ...(dto.monitoringMetrics !== undefined
            ? { monitoringMetrics: dto.monitoringMetrics }
            : {}),
          ...(dto.stopOrChangeCriteria !== undefined
            ? { stopOrChangeCriteria: dto.stopOrChangeCriteria }
            : {}),
          ...(dto.contraindications !== undefined
            ? { contraindications: dto.contraindications }
            : {}),
          ...(dto.prerequisites !== undefined ? { prerequisites: dto.prerequisites } : {}),
          ...(dto.deviationFromProtocol !== undefined
            ? {
                deviationFromProtocol: {
                  reason: dto.deviationFromProtocol.reason,
                  approvedBy: principal.userId,
                  approvedAt: signedAt.toISOString(),
                },
              }
            : {}),
          ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
          ...(dto.currentStage !== undefined ? { currentStage: dto.currentStage } : {}),
          signedBy: principal.userId,
          signedAt,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The clinical plan was modified by another request.',
        );
      }
      const plan = await tx.clinicalPlan.findUniqueOrThrow({
        where: { id: current.id },
        include: { orderRefs: true },
      });
      await tx.clinicalPlanRevision.create({
        data: {
          planId: plan.id,
          version: plan.version,
          action: 'revised',
          actorId: principal.userId,
          snapshot: {
            id: plan.id,
            encounterId: plan.encounterId,
            diagnosisId: plan.diagnosisId,
            summary: plan.summary,
            measurableGoals: plan.measurableGoals,
            protocolRef:
              plan.protocolTemplateId && plan.protocolTemplateVersionId
                ? {
                    templateId: plan.protocolTemplateId,
                    templateVersionId: plan.protocolTemplateVersionId,
                  }
                : null,
            milestones: plan.milestones,
            monitoringMetrics: plan.monitoringMetrics,
            stopOrChangeCriteria: plan.stopOrChangeCriteria,
            contraindications: plan.contraindications,
            prerequisites: plan.prerequisites,
            responsibleProviderId: plan.responsibleProviderId,
            deviationFromProtocol: plan.deviationFromProtocol,
            outcome: plan.outcome,
            currentStage: plan.currentStage,
            signedBy: plan.signedBy,
            signedAt: plan.signedAt?.toISOString() ?? null,
          },
        },
      });
      await this.encounters.addEvent(
        tx,
        encounterId,
        `Kế hoạch điều trị được cập nhật: ${dto.reason}`,
        'warning',
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'clinical_plan.revised',
          resourceType: 'clinical_plan',
          resourceId: plan.id,
          patientId: encounter.patientId,
          encounterId,
          organizationId: encounter.organizationId,
          reason: dto.reason,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return plan;
    });

    return { data: toClinicalPlanResponse(revised) };
  }

  async listClinicalPlanRevisions(principal: AuthenticatedPrincipal, encounterId: string) {
    await this.loadEncounter(principal, encounterId);
    const plan = await this.repo.findClinicalPlanByEncounterId(encounterId);
    if (!plan) {
      throw new NotFoundAppError('Clinical plan not found.');
    }
    const revisions = await this.repo.listClinicalPlanRevisions(plan.id);
    return { data: revisions.map(toClinicalPlanRevisionResponse) };
  }
}
