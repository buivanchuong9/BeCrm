import { Injectable } from '@nestjs/common';
import { EncounterStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { OutboxService } from '../../core/outbox/outbox.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ConflictAppError, ForbiddenAppError, NotFoundAppError } from '../../core/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';
import { canTransition } from '../encounters/encounter-state-machine';
import { AiAssessmentRepository } from './ai-assessment.repository';
import {
  evaluateRedFlag,
  isDataSufficient,
  scoreConditions,
  MODEL_VERSION,
  SymptomKey,
} from './ai-scoring.util';
import { toAIAssessmentResponse, toSymptomIntakeResponse } from './ai-assessment-response.mapper';
import { SubmitIntakeRequest } from './dto/submit-intake.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AiAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AiAssessmentRepository,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  private async assertOwnEncounter(principal: AuthenticatedPrincipal, encounterId: string) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    // docs/api.md AI-1/AI-4: patient (own encounter) only — this is a
    // self-service intake action, not a staff-on-behalf-of action.
    if (!principal.memberships.some((m) => m.role === 'patient')) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Only the patient may submit symptom intake.');
    }
    return encounter;
  }

  /** docs/api.md AI-1: full auto-transition chain in one encounter row
   * update — registered/intake_in_progress -> intake_complete -> ai_assessed
   * -> escalated (if red flag), matching the confirmed frontend orchestration
   * (multiple conceptual hops, one atomic DB write here). */
  async submitIntake(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: SubmitIntakeRequest,
    context: RequestContext,
  ) {
    const encounter = await this.assertOwnEncounter(principal, encounterId);
    if (encounter.status !== 'registered' && encounter.status !== 'intake_in_progress') {
      throw new ConflictAppError(
        'INVALID_STATE_TRANSITION',
        `Cannot submit intake while the encounter is "${encounter.status}".`,
      );
    }

    const symptoms = dto.symptoms as SymptomKey[];
    const sufficient = isDataSufficient(symptoms);
    const redFlag = sufficient
      ? evaluateRedFlag(dto.severity, symptoms)
      : { triggered: false, urgency: 'routine' as const, reasons: [] };
    const candidates = sufficient ? scoreConditions(dto.severity, symptoms) : [];
    const finalStatus: EncounterStatus = redFlag.triggered ? 'escalated' : 'ai_assessed';

    const result = await this.prisma.$transaction(async (tx) => {
      const intake = await this.assessments.createIntake(tx, {
        encounterId,
        chiefComplaint: dto.chiefComplaint,
        severity: dto.severity,
        durationDays: dto.durationDays,
        symptoms,
        history: dto.history,
        currentMedication: dto.currentMedication,
        images: dto.images,
      });

      const assessment = await this.assessments.createAssessment(tx, {
        encounterId,
        intakeId: intake.id,
        status: sufficient ? 'completed' : 'insufficient_data',
        candidateConditions: candidates as unknown as Prisma.InputJsonValue,
        redFlagTriggered: redFlag.triggered,
        redFlagUrgency: redFlag.triggered ? redFlag.urgency : null,
        redFlagReasons: redFlag.reasons,
        suggestedNextActions: sufficient ? [] : [],
        modelVersion: MODEL_VERSION,
        missingDataHints: sufficient
          ? []
          : ['Chưa chọn triệu chứng cụ thể', 'Cần thêm mô tả chi tiết về vùng da bị ảnh hưởng'],
      });

      const updateResult = await tx.medicalEncounter.updateMany({
        where: { id: encounterId, version: encounter.version },
        data: { status: finalStatus, version: { increment: 1 } },
      });
      if (updateResult.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The encounter was modified by another request.',
        );
      }
      await this.encounters.addEvent(
        tx,
        encounterId,
        'Đã hoàn tất khai triệu chứng (intake)',
        'info',
      );
      if (redFlag.triggered) {
        await tx.medicalEncounter.update({
          where: { id: encounterId },
          data: { blockingCondition: redFlag.reasons.join('; ') },
        });
        await this.encounters.addEvent(
          tx,
          encounterId,
          `Cảnh báo đỏ: ${redFlag.reasons.join('; ') || 'mức độ nghiêm trọng cao'}`,
          'danger',
        );
      } else {
        await this.encounters.addEvent(
          tx,
          encounterId,
          'Đã có kết quả đánh giá sơ bộ AI',
          'success',
        );
      }

      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'symptom_intake.submitted',
          resourceType: 'symptom_intake',
          resourceId: intake.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      if (redFlag.triggered) {
        await this.outbox.write(tx, {
          aggregateType: 'encounter',
          aggregateId: encounterId,
          eventType: 'clinical_alert.red_flag_triggered',
          payload: { encounterId, patientId: encounter.patientId, reasons: redFlag.reasons },
        });
      }

      return { intake, assessment };
    });

    return {
      data: {
        intake: toSymptomIntakeResponse(result.intake),
        assessment: toAIAssessmentResponse(result.assessment),
      },
    };
  }

  async requestReassessment(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: SubmitIntakeRequest,
    context: RequestContext,
  ) {
    const encounter = await this.assertOwnEncounter(principal, encounterId);
    const prior = await this.assessments.findLatestForEncounter(encounterId);

    const symptoms = dto.symptoms as SymptomKey[];
    const sufficient = isDataSufficient(symptoms);
    const redFlag = sufficient
      ? evaluateRedFlag(dto.severity, symptoms)
      : { triggered: false, urgency: 'routine' as const, reasons: [] };
    const candidates = sufficient ? scoreConditions(dto.severity, symptoms) : [];

    // Only re-drive the encounter's status if a legal edge exists from its
    // current state (docs/api.md AI-4) — advanced encounters (diagnosed and
    // beyond) simply record the new assessment without forcing an illegal
    // transition.
    let targetStatus: EncounterStatus | null = null;
    if (redFlag.triggered && canTransition(encounter.status, 'escalated')) {
      targetStatus = 'escalated';
    } else if (!redFlag.triggered && canTransition(encounter.status, 'ai_assessed')) {
      targetStatus = 'ai_assessed';
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const intake = await this.assessments.createIntake(tx, {
        encounterId,
        chiefComplaint: dto.chiefComplaint,
        severity: dto.severity,
        durationDays: dto.durationDays,
        symptoms,
        history: dto.history,
        currentMedication: dto.currentMedication,
        images: dto.images,
      });
      const assessment = await this.assessments.createAssessment(tx, {
        encounterId,
        intakeId: intake.id,
        status: sufficient ? 'completed' : 'insufficient_data',
        candidateConditions: candidates as unknown as Prisma.InputJsonValue,
        redFlagTriggered: redFlag.triggered,
        redFlagUrgency: redFlag.triggered ? redFlag.urgency : null,
        redFlagReasons: redFlag.reasons,
        suggestedNextActions: [],
        modelVersion: MODEL_VERSION,
        missingDataHints: sufficient ? [] : ['Chưa chọn triệu chứng cụ thể'],
      });
      if (prior) {
        await this.assessments.supersede(tx, prior.id, assessment.id);
      }
      if (targetStatus) {
        await tx.medicalEncounter.update({
          where: { id: encounterId },
          data: {
            status: targetStatus,
            version: { increment: 1 },
            ...(targetStatus === 'escalated'
              ? { blockingCondition: redFlag.reasons.join('; ') }
              : {}),
          },
        });
      }
      await this.encounters.addEvent(
        tx,
        encounterId,
        'Đã đánh giá lại triệu chứng (reassessment)',
        'info',
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'ai_assessment.reassessed',
          resourceType: 'ai_preliminary_assessment',
          resourceId: assessment.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return { intake, assessment };
    });

    return {
      data: {
        intake: toSymptomIntakeResponse(result.intake),
        assessment: toAIAssessmentResponse(result.assessment),
      },
    };
  }

  async listForEncounter(principal: AuthenticatedPrincipal, encounterId: string) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    const rows = await this.assessments.listForEncounter(encounterId);
    return { data: rows.map(toAIAssessmentResponse) };
  }

  async getDetail(principal: AuthenticatedPrincipal, assessmentId: string) {
    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundAppError('Assessment not found.');
    }
    const encounter = await this.encounters.findVisibleById(principal, assessment.encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Assessment not found.');
    }
    return { data: toAIAssessmentResponse(assessment) };
  }
}
