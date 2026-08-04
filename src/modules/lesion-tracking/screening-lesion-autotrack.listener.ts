import { Injectable, OnModuleInit } from '@nestjs/common';
import { LesionLaterality } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import {
  DOMAIN_EVENTS,
  DomainEventsService,
  SkinAnalysisCaseCreatedEvent,
} from '../../core/domain-events/domain-events.service';
import { PrismaService } from '../../core/database/prisma.service';
import { OperationsService } from '../operations/operations.service';
import { LesionTrackingService } from './lesion-tracking.service';

/**
 * Every screening submission (SkinAnalysisCaseService.analyze) becomes its
 * own tracked Lesion with that same photo as a submitted baseline
 * observation, so the recovery/comparison screen only ever needs a
 * follow-up photo — never a second "baseline" upload. Listens for the event
 * ai-assessment emits after a successful screening instead of ai-assessment
 * calling into this module directly, which would close a module dependency
 * cycle (see DomainEventsService's doc comment).
 *
 * A failure here must never surface back to the screening request that
 * already succeeded — it's recorded as its own audit entry instead.
 */
@Injectable()
export class ScreeningLesionAutotrackListener implements OnModuleInit {
  constructor(
    private readonly events: DomainEventsService,
    private readonly lesionTracking: LesionTrackingService,
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.events.on(DOMAIN_EVENTS.SKIN_ANALYSIS_CASE_CREATED, (payload) => {
      void this.handle(payload).catch((error: unknown) => this.recordFailure(payload, error));
    });
  }

  private async handle(payload: SkinAnalysisCaseCreatedEvent): Promise<void> {
    const now = new Date();
    const lesion = await this.lesionTracking.createLesion(
      payload.principal,
      payload.patientId,
      {
        title: `Sàng lọc AI · ${payload.bodyRegion}`.slice(0, 160),
        bodyRegion: payload.bodyRegion,
        laterality: LesionLaterality.UNKNOWN,
        firstObservedAt: now.toISOString(),
      },
      payload.context,
    );

    const upload = await this.operations.directUpload(
      payload.principal,
      'lesion-image',
      {
        originalname: payload.closeup.originalname,
        mimetype: payload.closeup.mimetype,
        size: payload.closeup.buffer.length,
        buffer: payload.closeup.buffer,
      },
      payload.context,
    );

    const observation = await this.lesionTracking.createObservation(
      payload.principal,
      lesion.data.id,
      {
        capturedAt: now.toISOString(),
        imageAssetIds: [upload.data.fileId],
        patientReportedSymptoms: payload.symptoms,
        clinicalMetrics: [],
      },
      payload.context,
    );

    await this.lesionTracking.submitObservation(
      payload.principal,
      observation.data.id,
      payload.context,
    );

    // Backfills the case this observation's baseline photo was already
    // analyzed under, so a later comparison run reuses it instead of
    // re-calling the AI service for the same photo a second time.
    await this.prisma.lesionObservation.update({
      where: { id: observation.data.id },
      data: { aiSkinAnalysisCaseId: payload.caseId },
    });
  }

  private async recordFailure(
    payload: SkinAnalysisCaseCreatedEvent,
    error: unknown,
  ): Promise<void> {
    await this.audit.write({
      actorId: payload.principal.userId,
      action: 'ai.skin_analysis_case.lesion_autotrack_failed',
      resourceType: 'ai_skin_analysis_case',
      resourceId: payload.caseId,
      patientId: payload.patientId,
      organizationId: payload.organizationId,
      requestId: payload.context.requestId ?? null,
      ip: payload.context.ip ?? null,
      userAgent: payload.context.userAgent ?? null,
      result: 'error',
      severity: 'warning',
      sourceModule: 'lesion-tracking',
      afterRedacted: {
        message: error instanceof Error ? error.message : 'Unknown error.',
      },
    });
  }
}
