import { Injectable } from '@nestjs/common';
import {
  LesionComparisonStatus,
  LesionImageAssetType,
  LesionImageQualityStatus,
  LesionMaskProvenance,
  LesionMetricSource,
  LesionMetricVerificationStatus,
  LesionObservationStatus,
  LesionReviewDecision,
  LesionReviewState,
  Prisma,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { FEATURE_FLAGS } from '../../common/authorization/feature-flags.catalog';
import { FeatureFlagsService } from '../../common/authorization/feature-flags.service';
import { AuditService } from '../../core/audit/audit.service';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ObjectStorageService } from '../../core/storage/object-storage.service';
import { isSuperAdministrator } from '../patients/patient-access';
import {
  CLINICAL_METRIC_CATALOG,
  interpretMetricChange,
  requireMetricDefinition,
} from './clinical-metric.catalog';
import { ComparisonAnalysisService } from './comparison-analysis.service';
import { RealImageAnalysisAdapter } from './analysis-adapters/real-image-analysis.adapter';
import {
  CorrectLesionMaskRequest,
  CreateDermatologyAdverseEventRequest,
  CreateLesionComparisonRequest,
  CreateLesionObservationRequest,
  CreateLesionRequest,
  CreateLesionReviewRequest,
  LesionListQuery,
  LesionMaskCorrectionAction,
  LesionTimelineQuery,
} from './dto/lesion-tracking.dto';
import {
  mapAdverseEvent,
  mapAuditEntry,
  mapComparison,
  mapLesion,
  mapObservation,
  mapTimelineEvent,
  ProtectedImageUrlMap,
} from './lesion-tracking.mapper';
import {
  COMPARISON_INCLUDE,
  LesionDetailRecord,
  LesionTrackingRepository,
  OBSERVATION_INCLUDE,
  ObservationRecord,
} from './lesion-tracking.repository';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

type AccessMode = 'read' | 'write' | 'review';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SHA_256 = /^[a-f0-9]{64}$/i;
const MAX_LESION_IMAGE_BYTES = 10 * 1024 * 1024;
const COMPARABLE_OBSERVATION_STATUSES = new Set<LesionObservationStatus>([
  LesionObservationStatus.READY_FOR_REVIEW,
  LesionObservationStatus.VERIFIED,
]);

@Injectable()
export class LesionTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: LesionTrackingRepository,
    private readonly storage: ObjectStorageService,
    private readonly audit: AuditService,
    private readonly comparisonAnalysis: ComparisonAnalysisService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly realAdapter: RealImageAnalysisAdapter,
  ) {}

  async listLesions(principal: AuthenticatedPrincipal, patientId: string, query: LesionListQuery) {
    const access = await this.assertPatientAccess(principal, patientId, 'read');
    await this.assertTimelineEnabled(access.organizationId);
    const page = await this.repository.listLesions(patientId, query.cursor, query.limit);
    return {
      data: {
        items: page.rows.map(mapLesion),
        nextCursor: page.nextCursor,
      },
    };
  }

  async getLesion(principal: AuthenticatedPrincipal, lesionId: string) {
    const access = await this.loadLesionAccess(lesionId);
    await this.assertPatientAccess(principal, access.patientId, 'read');
    await this.assertTimelineEnabled(access.organizationId);
    return { data: await this.buildBundle(lesionId) };
  }

  async deleteLesion(
    principal: AuthenticatedPrincipal,
    lesionId: string,
    context: RequestContext,
  ) {
    const access = await this.loadLesionAccess(lesionId);
    await this.assertPatientAccess(principal, access.patientId, 'write');
    await this.assertTimelineEnabled(access.organizationId);

    await this.prisma.$transaction(async (tx) => {
      // Find all observations for this lesion
      const obs = await tx.lesionObservation.findMany({
        where: { lesionId },
        select: { id: true },
      });
      const obsIds = obs.map((o) => o.id);

      // Find all comparison sessions for this lesion
      const comps = await tx.lesionComparisonSession.findMany({
        where: { lesionId },
        select: { id: true },
      });
      const compIds = comps.map((c) => c.id);

      // Clean up comparisons, reviews, metrics, and analyses
      if (compIds.length > 0) {
        await tx.lesionClinicianReview.deleteMany({
          where: { comparisonSessionId: { in: compIds } },
        });
        await tx.lesionComparisonMetric.deleteMany({
          where: { analysis: { comparisonSessionId: { in: compIds } } },
        });
        await tx.lesionComparisonAnalysis.deleteMany({
          where: { comparisonSessionId: { in: compIds } },
        });
        await tx.lesionComparisonSession.deleteMany({
          where: { id: { in: compIds } },
        });
      }

      // Clean up metrics and assets
      if (obsIds.length > 0) {
        await tx.lesionObservationMetric.deleteMany({
          where: { observationId: { in: obsIds } },
        });
        await tx.lesionImageAsset.deleteMany({
          where: { observationId: { in: obsIds } },
        });
        await tx.lesionObservation.deleteMany({
          where: { id: { in: obsIds } },
        });
      }

      // Delete timeline events and adverse events
      await tx.lesionTimelineEvent.deleteMany({
        where: { lesionId },
      });
      await tx.dermatologyAdverseEvent.deleteMany({
        where: { lesionId },
      });

      // Delete the lesion record
      await tx.lesion.delete({
        where: { id: lesionId },
      });

      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'lesion.deleted',
          resourceType: 'lesion',
          resourceId: lesionId,
          patientId: access.patientId,
          organizationId: access.organizationId,
          result: 'success',
          sourceModule: 'lesion-tracking',
        },
        tx,
      );
    });

    return { data: { success: true, lesionId } };
  }

  async createLesion(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateLesionRequest,
    context: RequestContext,
  ) {
    const access = await this.assertPatientAccess(principal, patientId, 'write');
    await this.assertTimelineEnabled(access.organizationId);
    if (
      !access.doctorAssigned &&
      [dto.diagnosis, dto.diagnosisCode, dto.clinicianId, dto.currentTreatment].some(
        (value) => value !== undefined,
      )
    ) {
      throw new ForbiddenAppError(
        'CLINICAL_AUTHORSHIP_REQUIRED',
        'Only an actively assigned doctor can set diagnosis, responsible clinician, or clinician-authored treatment.',
      );
    }

    const firstObservedAt = new Date(dto.firstObservedAt);
    this.assertNotFuture(firstObservedAt, 'firstObservedAt');

    // A super_administrator's own bypass doesn't make them a real treating
    // clinician — only default to self for an actually assigned doctor.
    // Admins may still explicitly name a real assigned doctor via
    // dto.clinicianId, which loadAssignedDoctor validates below.
    const responsibleClinicianId = access.doctorAssigned
      ? (dto.clinicianId ?? (access.superAdmin ? null : principal.userId))
      : null;
    const responsibleClinician = responsibleClinicianId
      ? await this.loadAssignedDoctor(patientId, access.organizationId, responsibleClinicianId)
      : null;

    const id = randomUUID();
    const code = `L-${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const lesion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lesion.create({
        data: {
          id,
          patientId,
          organizationId: access.organizationId,
          code,
          title: dto.title.trim(),
          bodyRegion: dto.bodyRegion.trim(),
          laterality: dto.laterality,
          diagnosis: access.doctorAssigned ? (dto.diagnosis?.trim() ?? null) : null,
          diagnosisCode: access.doctorAssigned ? (dto.diagnosisCode?.trim() ?? null) : null,
          firstObservedAt,
          createdById: principal.userId,
          createdByNameSnap: principal.displayName,
          responsibleClinicianId: responsibleClinician?.id ?? null,
          responsibleClinicianNameSnap: responsibleClinician?.displayName ?? null,
          currentTreatment: access.doctorAssigned ? (dto.currentTreatment?.trim() ?? null) : null,
        },
      });
      await tx.lesionTimelineEvent.create({
        data: {
          lesionId: created.id,
          occurredAt: firstObservedAt,
          type: 'OBSERVATION',
          title: 'Bắt đầu theo dõi tổn thương',
          summary: 'Hồ sơ tổn thương đã được tạo; chưa có kết luận đáp ứng điều trị.',
          source: access.self ? LesionMetricSource.PATIENT_REPORTED : 'SYSTEM',
          relatedId: created.id,
        },
      });
      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'lesion.created',
          resourceType: 'lesion',
          resourceId: created.id,
          patientId,
          organizationId: access.organizationId,
          result: 'success',
          sourceModule: 'lesion-tracking',
          changedFields: [
            'title',
            'bodyRegion',
            'laterality',
            'firstObservedAt',
            ...(access.self ? [] : ['diagnosis', 'diagnosisCode', 'responsibleClinicianId']),
          ],
          afterRedacted: {
            code: created.code,
            status: created.status,
            hasDiagnosis: created.diagnosis !== null,
          },
        },
        tx,
      );
      return created;
    });

    return { data: mapLesion(lesion) };
  }

  async createObservation(
    principal: AuthenticatedPrincipal,
    lesionId: string,
    dto: CreateLesionObservationRequest,
    context: RequestContext,
  ) {
    const lesion = await this.loadLesionAccess(lesionId);
    const access = await this.assertPatientAccess(principal, lesion.patientId, 'write');
    await this.assertTimelineEnabled(lesion.organizationId);
    const capturedAt = new Date(dto.capturedAt);
    this.assertNotFuture(capturedAt, 'capturedAt');

    if (access.self && dto.clinicianNotes !== undefined) {
      throw new ForbiddenAppError(
        'CLINICAL_AUTHORSHIP_REQUIRED',
        'A patient cannot author clinician notes.',
      );
    }

    if (dto.encounterId) {
      const encounter = await this.prisma.medicalEncounter.findUnique({
        where: { id: dto.encounterId },
        select: { patientId: true, organizationId: true },
      });
      if (
        !encounter ||
        encounter.patientId !== lesion.patientId ||
        encounter.organizationId !== lesion.organizationId
      ) {
        throw new ValidationAppError([
          {
            field: 'encounterId',
            code: 'ENCOUNTER_PATIENT_MISMATCH',
            message: 'Encounter must belong to the same patient and organization.',
          },
        ]);
      }
    }

    const metrics = this.validateObservationMetrics(dto, access.self);
    const uploadIds = [...new Set(dto.imageAssetIds)];
    if (uploadIds.length !== dto.imageAssetIds.length) {
      throw new ValidationAppError([{ field: 'imageAssetIds', code: 'DUPLICATE_IMAGE_ASSET' }]);
    }
    const uploads = await this.prisma.uploadObject.findMany({
      where: {
        id: { in: uploadIds },
        ownerId: principal.userId,
        status: 'confirmed',
        context: 'lesion-image',
      },
      include: { lesionImageAsset: { select: { id: true } } },
    });
    if (uploads.length !== uploadIds.length) {
      throw new ValidationAppError([
        {
          field: 'imageAssetIds',
          code: 'INVALID_LESION_IMAGE_UPLOAD',
          message: 'Every image must be a confirmed lesion-image upload owned by the caller.',
        },
      ]);
    }

    const uploadById = new Map(uploads.map((upload) => [upload.id, upload]));
    const orderedUploads = uploadIds.map((id) => uploadById.get(id)!);
    for (const upload of orderedUploads) {
      if (
        upload.lesionImageAsset ||
        !upload.confirmedAt ||
        !ALLOWED_IMAGE_MIME_TYPES.has(upload.contentType) ||
        !upload.fileHash ||
        !SHA_256.test(upload.fileHash)
      ) {
        throw new ValidationAppError([
          {
            field: 'imageAssetIds',
            code: 'INVALID_LESION_IMAGE_UPLOAD',
            message: 'An image is already attached or lacks verified MIME/checksum metadata.',
          },
        ]);
      }
    }

    const inspectedUploads = await Promise.all(
      orderedUploads.map(async (upload) => {
        const stored = await this.storage.inspectObject(upload.storageKey);
        if (
          stored.contentType !== upload.contentType ||
          stored.contentLength <= 0 ||
          stored.contentLength > MAX_LESION_IMAGE_BYTES
        ) {
          throw new ValidationAppError([
            {
              field: 'imageAssetIds',
              code: 'INVALID_STORED_IMAGE',
              message: 'Stored image metadata does not match its confirmed upload record.',
            },
          ]);
        }
        return { upload, fileSize: stored.contentLength };
      }),
    );

    let observationId: string;
    try {
      observationId = await this.prisma.$transaction(async (tx) => {
        const observation = await tx.lesionObservation.create({
          data: {
            lesionId,
            encounterId: dto.encounterId ?? null,
            capturedAt,
            capturedById: principal.userId,
            capturedByNameSnap: principal.displayName,
            patientReportedSymptoms: dto.patientReportedSymptoms,
            clinicianNotes: access.self ? null : (dto.clinicianNotes?.trim() ?? null),
            treatmentContext: dto.treatmentContext?.trim() ?? null,
            imageQualityStatus: LesionImageQualityStatus.CAUTION,
            imageQualityReasons: ['Chưa đánh giá chất lượng ảnh; bản ghi đang ở trạng thái nháp.'],
            status: LesionObservationStatus.DRAFT,
            metrics: {
              create: metrics.map(({ definition, metric }) => ({
                code: definition.code,
                label: definition.label,
                category: definition.category,
                value: metric.value,
                unit: definition.unit,
                source: metric.source,
                measurementMethod: metric.measurementMethod?.trim() ?? null,
                observedAt: new Date(metric.observedAt),
                verificationStatus: LesionMetricVerificationStatus.PRELIMINARY,
                performerId: principal.userId,
              })),
            },
            imageAssets: {
              create: inspectedUploads.map(({ upload, fileSize }) => ({
                patientId: lesion.patientId,
                uploadObjectId: upload.id,
                type: 'ORIGINAL',
                mimeType: upload.contentType,
                fileSize,
                checksum: upload.fileHash,
                capturedAt,
              })),
            },
          },
          select: { id: true },
        });
        await tx.lesionTimelineEvent.create({
          data: {
            lesionId,
            occurredAt: capturedAt,
            type: 'OBSERVATION',
            title: 'Đã lưu bản nháp lần theo dõi',
            summary: `Đã lưu ${inspectedUploads.length} ảnh gốc và ${metrics.length} chỉ số; chưa gửi để review.`,
            source: access.self
              ? LesionMetricSource.PATIENT_REPORTED
              : LesionMetricSource.CLINICIAN_REPORTED,
            relatedId: observation.id,
          },
        });
        await tx.lesionTimelineEvent.create({
          data: {
            lesionId,
            occurredAt: capturedAt,
            type: 'IMAGE',
            title: 'Đã liên kết ảnh tổn thương gốc',
            summary: `${inspectedUploads.length} ảnh đã xác minh MIME/checksum và được lưu bất biến.`,
            source: access.self
              ? LesionMetricSource.PATIENT_REPORTED
              : LesionMetricSource.CLINICIAN_REPORTED,
            relatedId: observation.id,
          },
        });
        if (dto.patientReportedSymptoms.length > 0) {
          await tx.lesionTimelineEvent.create({
            data: {
              lesionId,
              occurredAt: capturedAt,
              type: 'SYMPTOM',
              title: 'Đã ghi nhận triệu chứng người bệnh báo cáo',
              summary: `${dto.patientReportedSymptoms.length} triệu chứng được ghi nhận trong lần theo dõi.`,
              source: LesionMetricSource.PATIENT_REPORTED,
              relatedId: observation.id,
            },
          });
        }
        if (dto.treatmentContext?.trim()) {
          await tx.lesionTimelineEvent.create({
            data: {
              lesionId,
              occurredAt: capturedAt,
              type: 'TREATMENT',
              title: 'Đã ghi nhận bối cảnh điều trị',
              summary: 'Bối cảnh điều trị đã được liên kết với lần theo dõi này.',
              source: access.self
                ? LesionMetricSource.PATIENT_REPORTED
                : LesionMetricSource.CLINICIAN_REPORTED,
              relatedId: observation.id,
            },
          });
        }
        await this.audit.write(
          {
            ...this.auditActor(principal, context),
            action: 'lesion_observation.created',
            resourceType: 'lesion_observation',
            resourceId: observation.id,
            patientId: lesion.patientId,
            encounterId: dto.encounterId ?? null,
            organizationId: lesion.organizationId,
            result: 'success',
            sourceModule: 'lesion-tracking',
            afterRedacted: {
              status: LesionObservationStatus.DRAFT,
              originalImageCount: inspectedUploads.length,
              metricCodes: metrics.map(({ definition }) => definition.code),
            },
          },
          tx,
        );
        return observation.id;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictAppError(
          'LESION_IMAGE_ALREADY_ATTACHED',
          'At least one original image is already attached to another observation.',
        );
      }
      throw error;
    }

    const observation = await this.loadObservation(observationId);
    return {
      // Clinical mutation responses are cached for idempotent replay for up
      // to seven days. Never place one-hour capability URLs in that cache;
      // clients refetch the GET resource after the command succeeds.
      data: mapObservation(observation, new Map()),
    };
  }

  async submitObservation(
    principal: AuthenticatedPrincipal,
    observationId: string,
    context: RequestContext,
  ) {
    const observation = await this.repository.findObservationAccess(observationId);
    if (!observation) throw new NotFoundAppError('Lesion observation not found.');
    await this.assertPatientAccess(principal, observation.lesion.patientId, 'write');
    await this.assertTimelineEnabled(observation.lesion.organizationId);
    if (observation.status !== LesionObservationStatus.DRAFT) {
      throw new ConflictAppError(
        'INVALID_OBSERVATION_STATE',
        'Only a draft observation can be submitted.',
      );
    }

    const originalCount = await this.prisma.lesionImageAsset.count({
      where: { observationId, type: 'ORIGINAL' },
    });
    if (originalCount === 0) {
      throw new ConflictAppError(
        'OBSERVATION_IMAGE_REQUIRED',
        'At least one immutable original image is required before submission.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lesionObservation.updateMany({
        where: {
          id: observationId,
          status: LesionObservationStatus.DRAFT,
          revision: observation.revision,
        },
        data: {
          status: LesionObservationStatus.READY_FOR_REVIEW,
          imageQualityStatus: LesionImageQualityStatus.CAUTION,
          imageQualityReasons: [
            'Chưa có bộ kiểm định chất lượng ảnh được thẩm định; bác sĩ phải đánh giá ảnh gốc trực tiếp.',
          ],
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictAppError(
          'OBSERVATION_CONCURRENTLY_MODIFIED',
          'The observation changed before it could be submitted.',
        );
      }
      await tx.lesionTimelineEvent.create({
        data: {
          lesionId: observation.lesionId,
          type: 'OBSERVATION',
          title: 'Lần theo dõi sẵn sàng để review',
          summary:
            'Ảnh gốc được giữ nguyên; chất lượng ảnh chưa được tự động xác nhận và cần bác sĩ đánh giá.',
          source: 'SYSTEM',
          relatedId: observationId,
          warning: true,
        },
      });
      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'lesion_observation.submitted',
          resourceType: 'lesion_observation',
          resourceId: observationId,
          patientId: observation.lesion.patientId,
          organizationId: observation.lesion.organizationId,
          result: 'success',
          sourceModule: 'lesion-tracking',
          changedFields: ['status', 'imageQualityStatus', 'revision'],
          beforeRedacted: { status: LesionObservationStatus.DRAFT },
          afterRedacted: {
            status: LesionObservationStatus.READY_FOR_REVIEW,
            imageQualityStatus: LesionImageQualityStatus.CAUTION,
          },
        },
        tx,
      );
    });

    const updated = await this.loadObservation(observationId);
    return { data: mapObservation(updated, new Map()) };
  }

  async createComparison(
    principal: AuthenticatedPrincipal,
    lesionId: string,
    dto: CreateLesionComparisonRequest,
    idempotencyKey: string,
    context: RequestContext,
  ) {
    const lesion = await this.loadLesionAccess(lesionId);
    await this.assertPatientAccess(principal, lesion.patientId, 'write');
    await this.assertTimelineEnabled(lesion.organizationId);
    const normalizedIdempotencyKey = idempotencyKey.trim();
    if (
      normalizedIdempotencyKey !== idempotencyKey ||
      normalizedIdempotencyKey.length < 8 ||
      normalizedIdempotencyKey.length > 200
    ) {
      throw new ValidationAppError([
        {
          field: 'Idempotency-Key',
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must contain 8 to 200 non-whitespace characters.',
        },
      ]);
    }
    if (dto.baselineObservationId === dto.targetObservationId) {
      throw new ValidationAppError([
        { field: 'targetObservationId', code: 'OBSERVATIONS_MUST_DIFFER' },
      ]);
    }

    const existing = await this.prisma.lesionComparisonSession.findUnique({
      where: { idempotencyKey: normalizedIdempotencyKey },
      include: COMPARISON_INCLUDE,
    });
    if (existing) {
      if (
        existing.lesionId !== lesionId ||
        existing.baselineObservationId !== dto.baselineObservationId ||
        existing.targetObservationId !== dto.targetObservationId
      ) {
        throw new ConflictAppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key belongs to a different comparison request.',
        );
      }
      if (
        existing.status === LesionComparisonStatus.QUEUED ||
        existing.status === LesionComparisonStatus.FAILED
      ) {
        await this.comparisonAnalysis.analyze(existing.id);
        const retried = await this.repository.findComparison(existing.id);
        if (!retried) throw new NotFoundAppError('Comparison not found after retry.');
        return { data: mapComparison(retried) };
      }
      return { data: mapComparison(existing) };
    }

    const observations = await this.prisma.lesionObservation.findMany({
      where: {
        id: { in: [dto.baselineObservationId, dto.targetObservationId] },
        lesionId,
      },
      select: {
        id: true,
        capturedAt: true,
        status: true,
        imageQualityStatus: true,
        imageAssets: {
          where: { type: LesionImageAssetType.ORIGINAL },
          select: { checksum: true },
          take: 1,
        },
      },
    });
    if (observations.length !== 2) {
      throw new ValidationAppError([
        {
          field: 'baselineObservationId',
          code: 'OBSERVATION_LESION_MISMATCH',
          message: 'Both observations must belong to the requested lesion.',
        },
      ]);
    }
    const byId = new Map(observations.map((observation) => [observation.id, observation]));
    const baseline = byId.get(dto.baselineObservationId)!;
    const target = byId.get(dto.targetObservationId)!;
    if (
      !COMPARABLE_OBSERVATION_STATUSES.has(baseline.status) ||
      !COMPARABLE_OBSERVATION_STATUSES.has(target.status)
    ) {
      throw new ConflictAppError(
        'OBSERVATION_NOT_READY',
        'Both observations must be ready for review or verified.',
      );
    }
    if (
      baseline.imageQualityStatus === LesionImageQualityStatus.UNUSABLE ||
      target.imageQualityStatus === LesionImageQualityStatus.UNUSABLE
    ) {
      throw new ConflictAppError(
        'OBSERVATION_IMAGE_UNUSABLE',
        'An observation marked unusable cannot be compared.',
      );
    }
    if (baseline.capturedAt.getTime() >= target.capturedAt.getTime()) {
      throw new ValidationAppError([
        {
          field: 'targetObservationId',
          code: 'TARGET_MUST_BE_LATER',
          message: 'The target observation must be later than the baseline.',
        },
      ]);
    }
    const baselineChecksum = baseline.imageAssets[0]?.checksum?.toLowerCase();
    const targetChecksum = target.imageAssets[0]?.checksum?.toLowerCase();
    if (baselineChecksum && targetChecksum && baselineChecksum === targetChecksum) {
      throw new ValidationAppError([
        {
          field: 'targetObservationId',
          code: 'DUPLICATE_ORIGINAL_IMAGE',
          message:
            'Ảnh theo dõi trùng hoàn toàn với ảnh ban đầu. Vui lòng chọn ảnh được chụp tại thời điểm khác.',
        },
      ]);
    }

    let comparisonId: string;
    try {
      comparisonId = await this.prisma.$transaction(async (tx) => {
        const comparison = await tx.lesionComparisonSession.create({
          data: {
            lesionId,
            baselineObservationId: baseline.id,
            targetObservationId: target.id,
            requestedById: principal.userId,
            requestedByNameSnap: principal.displayName,
            idempotencyKey: normalizedIdempotencyKey,
            status: LesionComparisonStatus.QUEUED,
          },
        });
        await tx.lesionTimelineEvent.create({
          data: {
            lesionId,
            type: 'ANALYSIS',
            title: 'Đã yêu cầu đối chiếu hai lần theo dõi',
            summary:
              'Hệ thống sẽ tính chênh lệch từ dữ liệu lâm sàng đã lưu; chưa tạo kết luận hình ảnh tự động.',
            source: 'SYSTEM',
            relatedId: comparison.id,
          },
        });
        await this.audit.write(
          {
            ...this.auditActor(principal, context),
            action: 'lesion_comparison.requested',
            resourceType: 'lesion_comparison',
            resourceId: comparison.id,
            patientId: lesion.patientId,
            organizationId: lesion.organizationId,
            result: 'success',
            sourceModule: 'lesion-tracking',
            afterRedacted: {
              baselineObservationId: baseline.id,
              targetObservationId: target.id,
              status: comparison.status,
            },
          },
          tx,
        );
        return comparison.id;
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
      const replay = await this.prisma.lesionComparisonSession.findUnique({
        where: { idempotencyKey: normalizedIdempotencyKey },
      });
      if (
        !replay ||
        replay.lesionId !== lesionId ||
        replay.baselineObservationId !== baseline.id ||
        replay.targetObservationId !== target.id
      ) {
        throw new ConflictAppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key belongs to a different comparison request.',
        );
      }
      comparisonId = replay.id;
    }

    await this.comparisonAnalysis.analyze(comparisonId);
    const comparison = await this.repository.findComparison(comparisonId);
    if (!comparison) throw new NotFoundAppError('Comparison not found after creation.');
    return { data: mapComparison(comparison) };
  }

  async getComparison(principal: AuthenticatedPrincipal, comparisonId: string) {
    const access = await this.repository.findComparisonAccess(comparisonId);
    if (!access) throw new NotFoundAppError('Comparison not found.');
    await this.assertPatientAccess(principal, access.lesion.patientId, 'read');
    await this.assertTimelineEnabled(access.lesion.organizationId);
    const comparison = await this.repository.findComparison(comparisonId);
    if (!comparison) throw new NotFoundAppError('Comparison not found.');
    return { data: mapComparison(comparison) };
  }

  async reviewComparison(
    principal: AuthenticatedPrincipal,
    comparisonId: string,
    dto: CreateLesionReviewRequest,
    context: RequestContext,
  ) {
    const access = await this.repository.findComparisonAccess(comparisonId);
    if (!access) throw new NotFoundAppError('Comparison not found.');
    await this.assertPatientAccess(principal, access.lesion.patientId, 'review');
    await this.assertTimelineEnabled(access.lesion.organizationId);
    await this.featureFlags.assertEnabled(
      FEATURE_FLAGS.DERMA_TIMELINE_CLINICIAN_REVIEW,
      access.lesion.organizationId,
      'Clinician review for DermaTimeline is disabled for this organization.',
    );
    const comparison = await this.repository.findComparison(comparisonId);
    if (!comparison) throw new NotFoundAppError('Comparison not found.');
    if (comparison.status !== LesionComparisonStatus.READY_FOR_REVIEW || !comparison.analysis) {
      throw new ConflictAppError(
        'COMPARISON_NOT_READY_FOR_REVIEW',
        'A completed analysis is required before clinician review.',
      );
    }
    if (
      dto.requestRecapture &&
      (dto.decision !== LesionReviewDecision.REJECTED || dto.clinicalAssessment !== 'INDETERMINATE')
    ) {
      throw new ValidationAppError([
        {
          field: 'requestRecapture',
          code: 'INCONSISTENT_RECAPTURE_REVIEW',
          message: 'A recapture request requires REJECTED and INDETERMINATE.',
        },
      ]);
    }

    const correctedMetrics = this.validateCorrections(comparison, dto);
    const reviewState = this.reviewStateFor(dto.decision);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.lesionComparisonSession.updateMany({
        where: {
          id: comparison.id,
          status: LesionComparisonStatus.READY_FOR_REVIEW,
          updatedAt: comparison.updatedAt,
        },
        data: {
          status: dto.requestRecapture
            ? LesionComparisonStatus.NEEDS_RECAPTURE
            : LesionComparisonStatus.READY_FOR_REVIEW,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictAppError(
          'COMPARISON_CONCURRENTLY_REVIEWED',
          'The comparison changed before this review could be recorded.',
        );
      }
      const review = await tx.lesionClinicianReview.create({
        data: {
          comparisonSessionId: comparison.id,
          reviewerId: principal.userId,
          reviewerNameSnap: principal.displayName,
          decision: dto.decision,
          clinicalAssessment: dto.clinicalAssessment,
          correctedMetrics,
          comment: dto.comment.trim(),
          reason: dto.reason.trim(),
          imageLimitations: dto.imageLimitations ?? [],
          recaptureRequested: dto.requestRecapture ?? false,
        },
      });
      if (
        dto.decision === LesionReviewDecision.CONFIRMED ||
        dto.decision === LesionReviewDecision.MODIFIED
      ) {
        const correctedCodes = Object.keys(correctedMetrics);
        await tx.lesionComparisonMetric.updateMany({
          where: {
            analysisId: comparison.analysis!.id,
            clinicianVerified: false,
            ...(dto.decision === LesionReviewDecision.MODIFIED && correctedCodes.length > 0
              ? { key: { notIn: correctedCodes } }
              : {}),
          },
          data: { clinicianVerified: true },
        });
        const verifiedAt = new Date();
        await tx.lesionObservationMetric.updateMany({
          where: {
            verificationStatus: LesionMetricVerificationStatus.PRELIMINARY,
            OR:
              dto.decision === LesionReviewDecision.MODIFIED && correctedCodes.length > 0
                ? [
                    { observationId: comparison.baselineObservationId },
                    {
                      observationId: comparison.targetObservationId,
                      code: { notIn: correctedCodes },
                    },
                  ]
                : [
                    {
                      observationId: {
                        in: [comparison.baselineObservationId, comparison.targetObservationId],
                      },
                    },
                  ],
          },
          data: {
            verificationStatus: LesionMetricVerificationStatus.VERIFIED,
            verifiedById: principal.userId,
            verifiedAt,
          },
        });
        await tx.lesionObservation.updateMany({
          where: {
            id: {
              in: [comparison.baselineObservationId, comparison.targetObservationId],
            },
            status: LesionObservationStatus.READY_FOR_REVIEW,
          },
          data: {
            status: LesionObservationStatus.VERIFIED,
            revision: { increment: 1 },
          },
        });
      }
      await tx.lesion.update({
        where: { id: comparison.lesionId },
        data: {
          currentAssessment: dto.clinicalAssessment,
          reviewState,
          version: { increment: 1 },
        },
      });
      await tx.lesionTimelineEvent.create({
        data: {
          lesionId: comparison.lesionId,
          type: dto.requestRecapture ? 'RECAPTURE' : 'CLINICIAN_REVIEW',
          title: dto.requestRecapture
            ? 'Bác sĩ yêu cầu chụp lại ảnh'
            : 'Bác sĩ đã review kết quả đối chiếu',
          summary: dto.comment.trim() || `Đánh giá lâm sàng: ${dto.clinicalAssessment}.`,
          source: LesionMetricSource.CLINICIAN_REPORTED,
          relatedId: review.id,
          warning: dto.requestRecapture ?? false,
        },
      });
      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'lesion_comparison.reviewed',
          resourceType: 'lesion_clinician_review',
          resourceId: review.id,
          patientId: access.lesion.patientId,
          organizationId: access.lesion.organizationId,
          result: 'success',
          sourceModule: 'lesion-tracking',
          reason: dto.reason.trim(),
          changedFields: [
            'currentAssessment',
            'reviewState',
            ...(dto.decision === LesionReviewDecision.CONFIRMED ||
            dto.decision === LesionReviewDecision.MODIFIED
              ? ['observationStatus', 'metricVerificationStatus']
              : []),
            ...(dto.requestRecapture ? ['comparisonStatus'] : []),
          ],
          afterRedacted: {
            decision: dto.decision,
            clinicalAssessment: dto.clinicalAssessment,
            correctedMetricCodes: Object.keys(correctedMetrics),
            recaptureRequested: dto.requestRecapture ?? false,
          },
        },
        tx,
      );
    });

    return { data: await this.buildBundle(comparison.lesionId, false) };
  }

  /**
   * Doctor-only. lesion_image_assets is append-only, so confirming or
   * correcting an AI-proposed MASK never edits it — it always inserts a new
   * row (maskProvenance CLINICIAN_CONFIRMED/CLINICIAN_CORRECTED,
   * correctsAssetId pointing back at the row it supersedes). The relative
   * area is always recomputed from real, freshly-read pixel bytes via the AI
   * service's /v1/mask-pixel-count (never trusted from a stale cached
   * number, never fabricated) and persisted under a new metric key —
   * lesion_comparison_metrics is unique on (analysisId, key) and append-only,
   * so a correction is a new row under lesion-area-index-clinician-verified,
   * never an edit of the AI's lesion-area-index row.
   */
  async correctMask(
    principal: AuthenticatedPrincipal,
    comparisonId: string,
    assetId: string,
    dto: CorrectLesionMaskRequest,
    context: RequestContext,
  ) {
    const access = await this.repository.findComparisonAccess(comparisonId);
    if (!access) throw new NotFoundAppError('Comparison not found.');
    await this.assertPatientAccess(principal, access.lesion.patientId, 'review');
    await this.assertTimelineEnabled(access.lesion.organizationId);
    await this.featureFlags.assertEnabled(
      FEATURE_FLAGS.DERMA_TIMELINE_CLINICIAN_REVIEW,
      access.lesion.organizationId,
      'Clinician review for DermaTimeline is disabled for this organization.',
    );

    const comparison = await this.repository.findComparison(comparisonId);
    if (!comparison || !comparison.analysis) {
      throw new NotFoundAppError('Comparison analysis not found.');
    }

    const targetAsset = await this.prisma.lesionImageAsset.findUnique({
      where: { id: assetId },
      include: { upload: true },
    });
    if (
      !targetAsset ||
      targetAsset.type !== LesionImageAssetType.MASK ||
      ![comparison.baselineObservationId, comparison.targetObservationId].includes(
        targetAsset.observationId,
      )
    ) {
      throw new NotFoundAppError('Mask asset not found for this comparison.');
    }
    const side: 'baseline' | 'target' =
      targetAsset.observationId === comparison.baselineObservationId ? 'baseline' : 'target';

    let newAsset: { id: string; pixelArea: number };
    if (dto.action === LesionMaskCorrectionAction.CONFIRM) {
      newAsset = await this.confirmMaskAsset(access.lesion.patientId, comparisonId, targetAsset);
    } else {
      if (!dto.uploadObjectId) {
        throw new ValidationAppError([
          {
            field: 'uploadObjectId',
            code: 'UPLOAD_REQUIRED_FOR_CORRECTION',
            message: 'A corrected mask upload is required for action=CORRECT.',
          },
        ]);
      }
      newAsset = await this.attachCorrectedMaskAsset(
        principal,
        access.lesion.patientId,
        targetAsset,
        dto.uploadObjectId,
      );
    }

    const otherObservationId =
      side === 'baseline' ? comparison.targetObservationId : comparison.baselineObservationId;
    const otherMask = await this.currentMaskPixelArea(otherObservationId);
    if (!otherMask) {
      throw new ConflictAppError(
        'OTHER_SIDE_MASK_MISSING',
        'Không thể tính lại diện tích: mốc còn lại chưa có mask để đối chiếu.',
      );
    }
    const baselinePixels = side === 'baseline' ? newAsset.pixelArea : otherMask.pixelArea;
    const targetPixels = side === 'target' ? newAsset.pixelArea : otherMask.pixelArea;
    const relativeArea = Math.round((targetPixels / Math.max(baselinePixels, 1)) * 1000) / 10;

    const definition = requireMetricDefinition('lesion-area-index-clinician-verified');
    const interpretation = interpretMetricChange(definition, 100, relativeArea);

    await this.prisma.$transaction(async (tx) => {
      const metric = await tx.lesionComparisonMetric.create({
        data: {
          analysisId: comparison.analysis!.id,
          key: definition.code,
          label: definition.label,
          category: definition.category,
          baseline: 100,
          current: relativeArea,
          delta: relativeArea - 100,
          unit: definition.unit,
          source: LesionMetricSource.CLINICIAN_REPORTED,
          baselineSource: LesionMetricSource.CLINICIAN_REPORTED,
          currentSource: LesionMetricSource.CLINICIAN_REPORTED,
          measurementMethod:
            dto.action === LesionMaskCorrectionAction.CONFIRM
              ? 'Đếm pixel trong mask AI đề xuất, đã bác sĩ xác nhận không chỉnh sửa'
              : 'Đếm pixel trong mask đã bác sĩ chỉnh sửa lại',
          confidence: null,
          interpretation: interpretation.interpretation,
          interpretationPolicyId: interpretation.policyId,
          interpretationPolicyVersion: interpretation.policyVersion,
          clinicianVerified: true,
        },
      });
      await tx.lesionTimelineEvent.create({
        data: {
          lesionId: comparison.lesionId,
          type: 'CLINICIAN_REVIEW',
          title:
            dto.action === LesionMaskCorrectionAction.CONFIRM
              ? 'Bác sĩ đã xác nhận vùng tổn thương (mask) do AI đề xuất'
              : 'Bác sĩ đã chỉnh sửa lại vùng tổn thương (mask)',
          summary: `Diện tích tương đối đã tính lại từ mask ${dto.action === LesionMaskCorrectionAction.CONFIRM ? 'đã xác nhận' : 'đã chỉnh sửa'}: ${relativeArea}% so với mốc.`,
          source: LesionMetricSource.CLINICIAN_REPORTED,
          relatedId: newAsset.id,
        },
      });
      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'lesion_comparison.mask_corrected',
          resourceType: 'lesion_image_asset',
          resourceId: newAsset.id,
          patientId: access.lesion.patientId,
          organizationId: access.lesion.organizationId,
          result: 'success',
          sourceModule: 'lesion-tracking',
          reason: dto.reason.trim(),
          changedFields: ['maskProvenance', 'comparisonMetric'],
          afterRedacted: {
            action: dto.action,
            correctsAssetId: assetId,
            newAssetId: newAsset.id,
            newMetricId: metric.id,
            relativeArea,
          },
        },
        tx,
      );
    });

    return { data: await this.buildBundle(comparison.lesionId, false) };
  }

  private async confirmMaskAsset(
    patientId: string,
    comparisonId: string,
    source: Prisma.LesionImageAssetGetPayload<{ include: { upload: true } }>,
  ): Promise<{ id: string; pixelArea: number }> {
    const bytes = Buffer.from(await this.storage.readObjectBytes(source.upload.storageKey));
    const contentKey = `${comparisonId}:${source.observationId}:MASK:${randomUUID()}`;
    const storageKey = `derived/lesion-tracking/mask-corrections/${contentKey.replace(/[:]/g, '/')}`;
    const checksum = createHash('sha256').update(bytes).digest('hex');
    await this.storage.putObject(storageKey, source.upload.contentType, bytes);
    const upload = await this.prisma.uploadObject.create({
      data: {
        ownerId: source.upload.ownerId,
        fileName: `${contentKey}.png`,
        contentType: source.upload.contentType,
        context: 'lesion-image-derived',
        storageKey,
        fileHash: checksum,
        status: 'confirmed',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60_000),
        confirmedAt: new Date(),
      },
    });
    const { pixelArea } = await this.realAdapter.countMaskPixels(
      bytes,
      source.upload.contentType,
      upload.fileName,
    );
    const asset = await this.prisma.lesionImageAsset.create({
      data: {
        patientId,
        observationId: source.observationId,
        uploadObjectId: upload.id,
        originalAssetId: source.originalAssetId,
        type: LesionImageAssetType.MASK,
        mimeType: source.upload.contentType,
        width: source.width,
        height: source.height,
        fileSize: bytes.length,
        checksum,
        capturedAt: source.capturedAt,
        maskProvenance: LesionMaskProvenance.CLINICIAN_CONFIRMED,
        correctsAssetId: source.id,
      },
      select: { id: true },
    });
    return { id: asset.id, pixelArea };
  }

  private async attachCorrectedMaskAsset(
    principal: AuthenticatedPrincipal,
    patientId: string,
    source: Prisma.LesionImageAssetGetPayload<{ include: { upload: true } }>,
    uploadObjectId: string,
  ): Promise<{ id: string; pixelArea: number }> {
    const upload = await this.prisma.uploadObject.findFirst({
      where: {
        id: uploadObjectId,
        ownerId: principal.userId,
        status: 'confirmed',
        context: 'lesion-image',
      },
      include: { lesionImageAsset: { select: { id: true } } },
    });
    if (
      !upload ||
      upload.lesionImageAsset ||
      !upload.confirmedAt ||
      !ALLOWED_IMAGE_MIME_TYPES.has(upload.contentType) ||
      !upload.fileHash ||
      !SHA_256.test(upload.fileHash)
    ) {
      throw new ValidationAppError([
        {
          field: 'uploadObjectId',
          code: 'INVALID_MASK_CORRECTION_UPLOAD',
          message:
            'The corrected mask must be an unattached, confirmed lesion-image upload owned by the caller.',
        },
      ]);
    }
    const stored = await this.storage.inspectObject(upload.storageKey);
    if (stored.contentType !== upload.contentType || stored.contentLength <= 0) {
      throw new ValidationAppError([
        {
          field: 'uploadObjectId',
          code: 'INVALID_MASK_CORRECTION_UPLOAD',
          message: 'Stored file no longer matches the confirmed upload metadata.',
        },
      ]);
    }
    const bytes = Buffer.from(await this.storage.readObjectBytes(upload.storageKey));
    const { pixelArea, width, height } = await this.realAdapter.countMaskPixels(
      bytes,
      upload.contentType,
      upload.fileName,
    );
    const asset = await this.prisma.lesionImageAsset.create({
      data: {
        patientId,
        observationId: source.observationId,
        uploadObjectId: upload.id,
        originalAssetId: source.originalAssetId,
        type: LesionImageAssetType.MASK,
        mimeType: upload.contentType,
        width,
        height,
        fileSize: stored.contentLength,
        checksum: upload.fileHash,
        capturedAt: source.capturedAt,
        maskProvenance: LesionMaskProvenance.CLINICIAN_CORRECTED,
        correctsAssetId: source.id,
      },
      select: { id: true },
    });
    return { id: asset.id, pixelArea };
  }

  /** Latest MASK asset for an observation (whatever a comparison's other side
   * currently considers authoritative — clinician-confirmed/corrected if one
   * exists, else the AI proposal), re-counted from its real, current bytes.
   * Never returns a cached/stale pixel count. */
  private async currentMaskPixelArea(
    observationId: string,
  ): Promise<{ assetId: string; pixelArea: number } | null> {
    const asset = await this.prisma.lesionImageAsset.findFirst({
      where: { observationId, type: LesionImageAssetType.MASK },
      include: { upload: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!asset) return null;
    const bytes = Buffer.from(await this.storage.readObjectBytes(asset.upload.storageKey));
    const { pixelArea } = await this.realAdapter.countMaskPixels(
      bytes,
      asset.upload.contentType,
      asset.upload.fileName,
    );
    return { assetId: asset.id, pixelArea };
  }

  async getTimeline(
    principal: AuthenticatedPrincipal,
    lesionId: string,
    query: LesionTimelineQuery,
  ) {
    const lesion = await this.loadLesionAccess(lesionId);
    await this.assertPatientAccess(principal, lesion.patientId, 'read');
    await this.assertTimelineEnabled(lesion.organizationId);
    const page = await this.repository.listTimeline(lesionId, query.cursor, query.limit);
    return {
      data: {
        items: page.rows.map(mapTimelineEvent),
        nextCursor: page.nextCursor,
      },
    };
  }

  async createAdverseEvent(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateDermatologyAdverseEventRequest,
    context: RequestContext,
  ) {
    const access = await this.assertPatientAccess(principal, patientId, 'write');
    await this.assertTimelineEnabled(access.organizationId);
    await this.featureFlags.assertEnabled(
      FEATURE_FLAGS.DERMA_TIMELINE_ADVERSE_EVENT_SCREENING,
      access.organizationId,
      'Dermatology adverse-event screening is disabled for this organization.',
    );
    const onsetAt = new Date(dto.onsetAt);
    this.assertNotFuture(onsetAt, 'onsetAt');

    if (dto.lesionId) {
      const lesion = await this.prisma.lesion.findFirst({
        where: { id: dto.lesionId, patientId },
        select: { id: true },
      });
      if (!lesion) {
        throw new ValidationAppError([{ field: 'lesionId', code: 'LESION_PATIENT_MISMATCH' }]);
      }
    }

    const prescriptionIds = [...new Set(dto.suspectedMedicationIds)];
    if (prescriptionIds.length !== dto.suspectedMedicationIds.length) {
      throw new ValidationAppError([
        { field: 'suspectedMedicationIds', code: 'DUPLICATE_PRESCRIPTION_ID' },
      ]);
    }
    if (prescriptionIds.length > 0) {
      const medicationOrders = await this.prisma.medicationOrder.findMany({
        where: { id: { in: prescriptionIds } },
        select: { id: true, encounterId: true },
      });
      const medicationOrderIds = new Set(medicationOrders.map((item) => item.id));
      const remainingIds = prescriptionIds.filter((id) => !medicationOrderIds.has(id));
      const prescriptions = await this.prisma.prescription.findMany({
        where: {
          id: { in: remainingIds },
        },
        select: { id: true, encounterId: true },
      });
      const encounterIds = [
        ...new Set([
          ...medicationOrders.map((item) => item.encounterId),
          ...prescriptions.map((item) => item.encounterId),
        ]),
      ];
      const ownedEncounterCount = await this.prisma.medicalEncounter.count({
        where: { id: { in: encounterIds }, patientId },
      });
      if (
        medicationOrders.length + prescriptions.length !== prescriptionIds.length ||
        ownedEncounterCount !== encounterIds.length
      ) {
        throw new ValidationAppError([
          {
            field: 'suspectedMedicationIds',
            code: 'PRESCRIPTION_PATIENT_MISMATCH',
            message:
              'Every suspected medication order or legacy prescription must belong to this patient.',
          },
        ]);
      }
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dermatologyAdverseEvent.create({
        data: {
          patientId,
          organizationId: access.organizationId,
          lesionId: dto.lesionId ?? null,
          suspectedMedicationIds: prescriptionIds,
          onsetAt,
          symptoms: dto.symptoms,
          severity: dto.severity,
          urgencyLevel: dto.urgencyLevel,
          createdById: principal.userId,
        },
      });
      if (dto.lesionId) {
        await tx.lesion.update({
          where: { id: dto.lesionId },
          data: { suspectedAdverseEvent: true, version: { increment: 1 } },
        });
        await tx.lesionTimelineEvent.create({
          data: {
            lesionId: dto.lesionId,
            occurredAt: onsetAt,
            type: 'ADVERSE_EVENT',
            title: 'Đã ghi nhận biến cố bất lợi nghi ngờ',
            summary:
              'Biến cố đang chờ bác sĩ đánh giá quan hệ nhân quả; hệ thống không tự tạo hồ sơ dị ứng.',
            source: access.self
              ? LesionMetricSource.PATIENT_REPORTED
              : LesionMetricSource.CLINICIAN_REPORTED,
            relatedId: created.id,
            warning: true,
          },
        });
      }
      await this.audit.write(
        {
          ...this.auditActor(principal, context),
          action: 'dermatology_adverse_event.created',
          resourceType: 'dermatology_adverse_event',
          resourceId: created.id,
          patientId,
          organizationId: access.organizationId,
          result: 'success',
          severity: dto.urgencyLevel === 'EMERGENCY' ? 'critical' : 'warning',
          sourceModule: 'lesion-tracking',
          afterRedacted: {
            severity: created.severity,
            urgencyLevel: created.urgencyLevel,
            suspectedPrescriptionCount: prescriptionIds.length,
            causalityStatus: created.causalityStatus,
          },
        },
        tx,
      );
      return created;
    });

    return { data: mapAdverseEvent(event) };
  }

  private async buildBundle(lesionId: string, includeProtectedUrls = true) {
    const lesion = await this.repository.findLesionDetail(lesionId);
    if (!lesion) throw new NotFoundAppError('Lesion not found.');
    const protectedUrls = includeProtectedUrls
      ? await this.createProtectedUrlMap(lesion.observations)
      : new Map<string, string | null>();
    const timeline = await this.repository.listTimeline(lesion.id, undefined, 100);
    const resourceIds = this.bundleResourceIds(lesion);
    const audit = await this.repository.listAudit(lesion.patientId, resourceIds);
    return {
      lesion: mapLesion(lesion),
      observations: lesion.observations.map((observation) =>
        mapObservation(observation, protectedUrls),
      ),
      comparison: lesion.comparisons[0] ? mapComparison(lesion.comparisons[0]) : null,
      timeline: timeline.rows.map(mapTimelineEvent),
      audit: audit.map(mapAuditEntry),
    };
  }

  private assertTimelineEnabled(organizationId: string): Promise<void> {
    return this.featureFlags.assertEnabled(
      FEATURE_FLAGS.DERMA_TIMELINE,
      organizationId,
      'DermaTimeline is disabled for this organization.',
    );
  }

  private bundleResourceIds(lesion: LesionDetailRecord): string[] {
    const ids = [lesion.id];
    for (const observation of lesion.observations) {
      ids.push(observation.id);
      ids.push(...observation.imageAssets.map((asset) => asset.id));
      ids.push(...observation.metrics.map((metric) => metric.id));
    }
    for (const comparison of lesion.comparisons) {
      ids.push(comparison.id);
      if (comparison.analysis) {
        ids.push(comparison.analysis.id);
        ids.push(...comparison.analysis.metrics.map((metric) => metric.id));
      }
      ids.push(...comparison.reviews.map((review) => review.id));
    }
    return ids;
  }

  private async createProtectedUrlMap(
    observations: ObservationRecord[],
  ): Promise<ProtectedImageUrlMap> {
    const entries = await Promise.all(
      observations.flatMap((observation) =>
        observation.imageAssets.map(async (asset): Promise<[string, string | null]> => {
          if (asset.upload.status !== 'confirmed' || !asset.upload.confirmedAt) {
            return [asset.id, null];
          }
          const url = await this.storage
            .presignGet(asset.upload.storageKey, asset.upload.id)
            .catch(() => null);
          return [asset.id, url];
        }),
      ),
    );
    return new Map(entries);
  }

  private async loadObservation(observationId: string): Promise<ObservationRecord> {
    const observation = await this.prisma.lesionObservation.findUnique({
      where: { id: observationId },
      include: OBSERVATION_INCLUDE,
    });
    if (!observation) throw new NotFoundAppError('Lesion observation not found.');
    return observation;
  }

  private async loadLesionAccess(lesionId: string) {
    const lesion = await this.repository.findLesionAccess(lesionId);
    if (!lesion) throw new NotFoundAppError('Lesion not found.');
    return lesion;
  }

  private async assertPatientAccess(
    principal: AuthenticatedPrincipal,
    patientId: string,
    mode: AccessMode,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        primaryDoctorId: true,
      },
    });
    if (!patient) throw new NotFoundAppError('Patient not found.');

    const now = new Date();
    const doctorRole = principal.memberships.some(
      (membership) =>
        membership.organizationId === patient.organizationId && membership.role === 'doctor',
    );
    const nurseRole = principal.memberships.some(
      (membership) =>
        membership.organizationId === patient.organizationId && membership.role === 'nurse',
    );
    const clinicalRelationships =
      doctorRole || nurseRole
        ? await this.prisma.patientCareTeamMember.findMany({
            where: {
              patientId,
              userId: principal.userId,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
            select: { relationship: true },
          })
        : [];
    const relationships = new Set(
      clinicalRelationships.map((relationship) => relationship.relationship),
    );
    const self = patient.userId === principal.userId;
    // A platform super_administrator has full authority across every
    // feature, same as elsewhere in the app (see isSuperAdministrator usage
    // in patients/policies) — treated as an assigned doctor here so they can
    // read, write, and clinically review any patient's lesion data without
    // requiring a care-team assignment.
    const superAdmin = isSuperAdministrator(principal);
    const doctorAssigned =
      superAdmin ||
      (doctorRole &&
        (patient.primaryDoctorId === principal.userId ||
          relationships.has('primary_doctor') ||
          relationships.has('assigned_doctor')));
    const nurseAssigned = nurseRole && relationships.has('assigned_nurse');
    const medicalAdminRead =
      mode === 'read' &&
      principal.memberships.some(
        (membership) =>
          membership.organizationId === patient.organizationId &&
          membership.role === 'medical_administrator',
      );
    const allowed =
      mode === 'review'
        ? doctorAssigned
        : mode === 'write'
          ? self || doctorAssigned || nurseAssigned
          : self || doctorAssigned || nurseAssigned || medicalAdminRead;
    if (!allowed) {
      throw new ForbiddenAppError(
        'LESION_ACCESS_DENIED',
        mode === 'review'
          ? 'Only an actively assigned doctor may review this comparison.'
          : 'No active patient or care-team relationship authorizes this request.',
      );
    }
    return {
      ...patient,
      self,
      doctorAssigned,
      nurseAssigned,
      medicalAdminRead,
      superAdmin,
    };
  }

  private async loadAssignedDoctor(patientId: string, organizationId: string, doctorId: string) {
    const now = new Date();
    const [patient, membership, relationship] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { primaryDoctorId: true },
      }),
      this.prisma.userMembership.findFirst({
        where: {
          userId: doctorId,
          organizationId,
          role: 'doctor',
          status: 'active',
        },
        select: { id: true },
      }),
      this.prisma.patientCareTeamMember.findFirst({
        where: {
          patientId,
          userId: doctorId,
          relationship: { in: ['primary_doctor', 'assigned_doctor'] },
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { id: true },
      }),
    ]);
    if (!membership || (!relationship && patient?.primaryDoctorId !== doctorId)) {
      throw new ValidationAppError([
        {
          field: 'clinicianId',
          code: 'CLINICIAN_NOT_ASSIGNED',
          message: 'Responsible clinician must be an actively assigned doctor.',
        },
      ]);
    }
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, displayName: true },
    });
    if (!doctor) throw new NotFoundAppError('Responsible clinician not found.');
    return doctor;
  }

  private validateObservationMetrics(
    dto: CreateLesionObservationRequest,
    patientAuthored: boolean,
  ) {
    const seen = new Set<string>();
    return dto.clinicalMetrics.map((metric, index) => {
      if (seen.has(metric.code)) {
        throw new ValidationAppError([
          {
            field: `clinicalMetrics.${index}.code`,
            code: 'DUPLICATE_CLINICAL_METRIC',
          },
        ]);
      }
      seen.add(metric.code);
      const definition = requireMetricDefinition(metric.code);
      if (
        metric.source !== LesionMetricSource.PATIENT_REPORTED &&
        metric.source !== LesionMetricSource.CLINICIAN_REPORTED
      ) {
        throw new ValidationAppError([
          {
            field: `clinicalMetrics.${index}.source`,
            code: 'UNTRUSTED_METRIC_SOURCE',
            message:
              'Public requests cannot author image-analysis, device, or imported measurements.',
          },
        ]);
      }
      if (patientAuthored && metric.source !== LesionMetricSource.PATIENT_REPORTED) {
        throw new ForbiddenAppError(
          'CLINICAL_AUTHORSHIP_REQUIRED',
          'Patients may submit only patient-reported clinical metrics.',
        );
      }
      if (!definition.allowedSources.includes(metric.source)) {
        throw new ValidationAppError([
          {
            field: `clinicalMetrics.${index}.source`,
            code: 'METRIC_SOURCE_NOT_ALLOWED',
          },
        ]);
      }
      if (metric.value < definition.minimum || metric.value > definition.maximum) {
        throw new ValidationAppError([
          {
            field: `clinicalMetrics.${index}.value`,
            code: 'METRIC_OUT_OF_RANGE',
            message: `Value must be between ${definition.minimum} and ${definition.maximum} ${definition.unit}.`,
          },
        ]);
      }
      if (definition.methodRequired && !metric.measurementMethod?.trim()) {
        throw new ValidationAppError([
          {
            field: `clinicalMetrics.${index}.measurementMethod`,
            code: 'MEASUREMENT_METHOD_REQUIRED',
          },
        ]);
      }
      this.assertNotFuture(new Date(metric.observedAt), `clinicalMetrics.${index}.observedAt`);
      return { definition, metric };
    });
  }

  private validateCorrections(
    comparison: NonNullable<Awaited<ReturnType<LesionTrackingRepository['findComparison']>>>,
    dto: CreateLesionReviewRequest,
  ): Record<string, number> {
    const corrected = dto.correctedMetrics ?? {};
    const analysisCodes = new Set(comparison.analysis?.metrics.map((metric) => metric.key) ?? []);
    for (const [code, value] of Object.entries(corrected)) {
      if (!analysisCodes.has(code)) {
        throw new ValidationAppError([
          { field: `correctedMetrics.${code}`, code: 'UNKNOWN_COMPARISON_METRIC' },
        ]);
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationAppError([
          { field: `correctedMetrics.${code}`, code: 'INVALID_METRIC_VALUE' },
        ]);
      }
      const definition = CLINICAL_METRIC_CATALOG.get(code);
      if (!definition || value < definition.minimum || value > definition.maximum) {
        throw new ValidationAppError([
          { field: `correctedMetrics.${code}`, code: 'METRIC_OUT_OF_RANGE' },
        ]);
      }
    }
    if (dto.decision !== LesionReviewDecision.MODIFIED && Object.keys(corrected).length > 0) {
      throw new ValidationAppError([
        {
          field: 'correctedMetrics',
          code: 'CORRECTION_REQUIRES_MODIFIED_DECISION',
        },
      ]);
    }
    return corrected;
  }

  private reviewStateFor(decision: LesionReviewDecision): LesionReviewState {
    if (decision === LesionReviewDecision.CONFIRMED) {
      return LesionReviewState.CLINICIAN_CONFIRMED;
    }
    if (decision === LesionReviewDecision.MODIFIED) {
      return LesionReviewState.CLINICIAN_MODIFIED;
    }
    return LesionReviewState.CLINICIAN_REJECTED;
  }

  private assertNotFuture(value: Date, field: string): void {
    if (!Number.isFinite(value.getTime()) || value.getTime() > Date.now() + 5 * 60_000) {
      throw new ValidationAppError([
        {
          field,
          code: 'INVALID_CLINICAL_TIMESTAMP',
          message: 'Timestamp cannot be in the future.',
        },
      ]);
    }
  }

  private auditActor(principal: AuthenticatedPrincipal, context: RequestContext) {
    return {
      actorId: principal.userId,
      actorNameSnapshot: principal.displayName,
      actorRoleSnapshot:
        principal.memberships.find((membership) =>
          ['doctor', 'nurse', 'patient', 'medical_administrator'].includes(membership.role),
        )?.role ?? null,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
