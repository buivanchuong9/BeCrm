/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LesionClinicalAssessment,
  LesionComparisonStatus,
  LesionImageQualityStatus,
  LesionMetricSource,
  LesionObservationStatus,
  LesionReviewDecision,
} from '@prisma/client';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { LesionTrackingService } from './lesion-tracking.service';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const PATIENT_ID = '00000000-0000-4000-8000-000000000002';
const PATIENT_USER_ID = '00000000-0000-4000-8000-000000000003';
const DOCTOR_ID = '00000000-0000-4000-8000-000000000004';
const NURSE_ID = '00000000-0000-4000-8000-000000000005';
const LESION_ID = '00000000-0000-4000-8000-000000000006';
const BASELINE_ID = '00000000-0000-4000-8000-000000000007';
const TARGET_ID = '00000000-0000-4000-8000-000000000008';
const COMPARISON_ID = '00000000-0000-4000-8000-000000000009';
const IDEMPOTENCY_KEY = 'compare-lesion-0001';

function principal(
  role: string,
  userId = '00000000-0000-4000-8000-000000000099',
): AuthenticatedPrincipal {
  return {
    userId,
    email: `${role}@example.test`,
    displayName: role,
    memberships: [
      {
        organizationId: ORGANIZATION_ID,
        clinicLocationId: null,
        departmentId: null,
        role: role as any,
      },
    ],
  };
}

function patientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PATIENT_ID,
    userId: PATIENT_USER_ID,
    organizationId: ORGANIZATION_ID,
    primaryDoctorId: null,
    ...overrides,
  };
}

function lesionAccessRow() {
  return {
    id: LESION_ID,
    patientId: PATIENT_ID,
    organizationId: ORGANIZATION_ID,
    responsibleClinicianId: DOCTOR_ID,
    status: 'ACTIVE',
    patient: {
      userId: PATIENT_USER_ID,
      primaryDoctorId: DOCTOR_ID,
    },
  };
}

function comparisonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: COMPARISON_ID,
    lesionId: LESION_ID,
    baselineObservationId: BASELINE_ID,
    targetObservationId: TARGET_ID,
    requestedById: DOCTOR_ID,
    requestedByNameSnap: 'Doctor',
    requestedAt: new Date('2026-01-03T00:00:00.000Z'),
    completedAt: null,
    failureReason: 'temporary analysis failure',
    analysisVersion: null,
    idempotencyKey: IDEMPOTENCY_KEY,
    attemptCount: 1,
    status: LesionComparisonStatus.FAILED,
    analysis: null,
    reviews: [],
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createLesionDto(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Tổn thương cẳng tay',
    bodyRegion: 'Cẳng tay',
    laterality: 'LEFT',
    firstObservedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createObservationDto(source: LesionMetricSource) {
  return {
    capturedAt: '2026-01-02T00:00:00.000Z',
    imageAssetIds: ['00000000-0000-4000-8000-000000000010'],
    patientReportedSymptoms: [],
    clinicalMetrics: [
      {
        code: 'lesion-longest-diameter-mm',
        value: 12,
        source,
        measurementMethod: 'Thước kẹp đã hiệu chuẩn',
        observedAt: '2026-01-02T00:00:00.000Z',
      },
    ],
  };
}

describe('LesionTrackingService — authorization, trusted input, and idempotency', () => {
  let prisma: any;
  let repository: any;
  let storage: any;
  let audit: any;
  let comparisonAnalysis: any;
  let featureFlags: any;
  let service: LesionTrackingService;

  beforeEach(() => {
    prisma = {
      patient: { findUnique: jest.fn().mockResolvedValue(patientRow()) },
      patientCareTeamMember: { findMany: jest.fn().mockResolvedValue([]) },
      lesionComparisonSession: { findUnique: jest.fn() },
      lesionObservation: { findMany: jest.fn() },
      uploadObject: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    repository = {
      listLesions: jest.fn(),
      findLesionAccess: jest.fn().mockResolvedValue(lesionAccessRow()),
      findComparisonAccess: jest.fn(),
      findComparison: jest.fn(),
    };
    storage = {
      inspectObject: jest.fn(),
      presignGet: jest.fn(),
    };
    audit = { write: jest.fn() };
    comparisonAnalysis = { analyze: jest.fn().mockResolvedValue(undefined) };
    featureFlags = { assertEnabled: jest.fn().mockResolvedValue(undefined) };
    service = new LesionTrackingService(
      prisma,
      repository,
      storage,
      audit,
      comparisonAnalysis,
      featureFlags,
    );
  });

  describe('care-team authorization', () => {
    it('does not grant receptionist implicit access to a patient clinical timeline', async () => {
      await expect(
        service.listLesions(principal('receptionist'), PATIENT_ID, { limit: 30 } as any),
      ).rejects.toMatchObject({ code: 'LESION_ACCESS_DENIED' });

      expect(repository.listLesions).not.toHaveBeenCalled();
      expect(featureFlags.assertEnabled).not.toHaveBeenCalled();
    });

    it('grants super_administrator full access to a patient clinical timeline, same as an assigned doctor', async () => {
      repository.listLesions.mockResolvedValue({ rows: [], nextCursor: null });

      await expect(
        service.listLesions(principal('super_administrator'), PATIENT_ID, { limit: 30 } as any),
      ).resolves.toEqual({ data: { items: [], nextCursor: null } });

      expect(repository.listLesions).toHaveBeenCalled();
    });

    it('rejects patient-authored diagnosis, clinician assignment, and treatment fields', async () => {
      prisma.patient.findUnique.mockResolvedValue(patientRow());

      await expect(
        service.createLesion(
          principal('patient', PATIENT_USER_ID),
          PATIENT_ID,
          createLesionDto({
            diagnosis: 'Không được tin cậy từ client bệnh nhân',
            diagnosisCode: 'L98.9',
            clinicianId: DOCTOR_ID,
            currentTreatment: 'Tự khai như chỉ định bác sĩ',
          }) as any,
          {},
        ),
      ).rejects.toMatchObject({ code: 'CLINICAL_AUTHORSHIP_REQUIRED' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows an assigned nurse to contribute care data but not author a diagnosis', async () => {
      prisma.patient.findUnique.mockResolvedValue(patientRow());
      prisma.patientCareTeamMember.findMany.mockResolvedValue([{ relationship: 'assigned_nurse' }]);

      await expect(
        service.createLesion(
          principal('nurse', NURSE_ID),
          PATIENT_ID,
          createLesionDto({ diagnosis: 'Chẩn đoán do điều dưỡng nhập' }) as any,
          {},
        ),
      ).rejects.toMatchObject({ code: 'CLINICAL_AUTHORSHIP_REQUIRED' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lets a super_administrator author a diagnosis without being a registered/assigned doctor themself', async () => {
      prisma.patient.findUnique.mockResolvedValue(patientRow());
      prisma.userMembership = { findFirst: jest.fn() };
      const createdLesion = {
        id: 'new-lesion',
        patientId: PATIENT_ID,
        code: 'L-TEST0001',
        title: 'Tổn thương cẳng tay',
        bodyRegion: 'Cẳng tay',
        laterality: 'LEFT',
        diagnosis: 'Chẩn đoán do admin nhập',
        diagnosisCode: null,
        firstObservedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: 'ACTIVE',
        createdByNameSnap: 'super_administrator',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        currentAssessment: 'INDETERMINATE',
        reviewState: 'AI_SUGGESTION',
        responsibleClinicianNameSnap: null,
        responsibleClinicianId: null,
        currentTreatment: null,
        clinicianSelectedBaselineId: null,
        suspectedAdverseEvent: false,
      };
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          lesion: { create: jest.fn().mockResolvedValue(createdLesion) },
          lesionTimelineEvent: { create: jest.fn().mockResolvedValue({}) },
        }),
      );

      await expect(
        service.createLesion(
          principal('super_administrator'),
          PATIENT_ID,
          createLesionDto({ diagnosis: 'Chẩn đoán do admin nhập' }) as any,
          {},
        ),
      ).resolves.toMatchObject({ data: { diagnosis: 'Chẩn đoán do admin nhập', clinicianId: null } });

      // Regression guard: a super_administrator isn't auto-assigned as the
      // lesion's responsible clinician, so loadAssignedDoctor's re-validation
      // (which would reject them for not actually being an assigned doctor)
      // must never run.
      expect(prisma.userMembership.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('trusted clinical metric provenance', () => {
    it.each([
      LesionMetricSource.IMAGE_ANALYSIS,
      LesionMetricSource.DEVICE,
      LesionMetricSource.IMPORTED,
    ])('rejects client-spoofed %s measurements', async (source) => {
      prisma.patient.findUnique.mockResolvedValue(patientRow({ primaryDoctorId: DOCTOR_ID }));

      await expect(
        service.createObservation(
          principal('doctor', DOCTOR_ID),
          LESION_ID,
          createObservationDto(source) as any,
          {},
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'clinicalMetrics.0.source',
            code: 'UNTRUSTED_METRIC_SOURCE',
          }),
        ]),
      });

      expect(prisma.uploadObject.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('comparison pair invariants', () => {
    beforeEach(() => {
      prisma.patient.findUnique.mockResolvedValue(patientRow({ primaryDoctorId: DOCTOR_ID }));
    });

    it('rejects comparing an observation with itself before idempotency or persistence work', async () => {
      await expect(
        service.createComparison(
          principal('doctor', DOCTOR_ID),
          LESION_ID,
          { baselineObservationId: BASELINE_ID, targetObservationId: BASELINE_ID },
          IDEMPOTENCY_KEY,
          {},
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ code: 'OBSERVATIONS_MUST_DIFFER' }),
        ]),
      });

      expect(prisma.lesionComparisonSession.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a pair unless both observations belong to the requested lesion', async () => {
      prisma.lesionComparisonSession.findUnique.mockResolvedValue(null);
      prisma.lesionObservation.findMany.mockResolvedValue([
        {
          id: BASELINE_ID,
          capturedAt: new Date('2026-01-01T00:00:00.000Z'),
          status: LesionObservationStatus.READY_FOR_REVIEW,
          imageQualityStatus: LesionImageQualityStatus.CAUTION,
        },
      ]);

      await expect(
        service.createComparison(
          principal('doctor', DOCTOR_ID),
          LESION_ID,
          { baselineObservationId: BASELINE_ID, targetObservationId: TARGET_ID },
          IDEMPOTENCY_KEY,
          {},
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ code: 'OBSERVATION_LESION_MISMATCH' }),
        ]),
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(comparisonAnalysis.analyze).not.toHaveBeenCalled();
    });

    it('rejects observations whose immutable original checksums are identical', async () => {
      const checksum = 'a'.repeat(64);
      prisma.lesionComparisonSession.findUnique.mockResolvedValue(null);
      prisma.lesionObservation.findMany.mockResolvedValue([
        {
          id: BASELINE_ID,
          capturedAt: new Date('2026-01-01T00:00:00.000Z'),
          status: LesionObservationStatus.READY_FOR_REVIEW,
          imageQualityStatus: LesionImageQualityStatus.CAUTION,
          imageAssets: [{ checksum }],
        },
        {
          id: TARGET_ID,
          capturedAt: new Date('2026-01-02T00:00:00.000Z'),
          status: LesionObservationStatus.READY_FOR_REVIEW,
          imageQualityStatus: LesionImageQualityStatus.CAUTION,
          imageAssets: [{ checksum }],
        },
      ]);

      await expect(
        service.createComparison(
          principal('doctor', DOCTOR_ID),
          LESION_ID,
          { baselineObservationId: BASELINE_ID, targetObservationId: TARGET_ID },
          IDEMPOTENCY_KEY,
          {},
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ code: 'DUPLICATE_ORIGINAL_IMAGE' }),
        ]),
      });

      expect(comparisonAnalysis.analyze).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('comparison idempotency', () => {
    beforeEach(() => {
      prisma.patient.findUnique.mockResolvedValue(patientRow({ primaryDoctorId: DOCTOR_ID }));
    });

    it('rejects reusing an idempotency key for a different comparison payload', async () => {
      prisma.lesionComparisonSession.findUnique.mockResolvedValue(
        comparisonRow({ targetObservationId: '00000000-0000-4000-8000-000000000011' }),
      );

      await expect(
        service.createComparison(
          principal('doctor', DOCTOR_ID),
          LESION_ID,
          { baselineObservationId: BASELINE_ID, targetObservationId: TARGET_ID },
          IDEMPOTENCY_KEY,
          {},
        ),
      ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });

      expect(prisma.lesionObservation.findMany).not.toHaveBeenCalled();
      expect(comparisonAnalysis.analyze).not.toHaveBeenCalled();
    });

    it('retries a matching failed comparison without creating a duplicate session', async () => {
      prisma.lesionComparisonSession.findUnique.mockResolvedValue(comparisonRow());
      repository.findComparison.mockResolvedValue(
        comparisonRow({
          status: LesionComparisonStatus.READY_FOR_REVIEW,
          failureReason: null,
          completedAt: new Date('2026-01-03T00:01:00.000Z'),
        }),
      );

      const response = await service.createComparison(
        principal('doctor', DOCTOR_ID),
        LESION_ID,
        { baselineObservationId: BASELINE_ID, targetObservationId: TARGET_ID },
        IDEMPOTENCY_KEY,
        {},
      );

      expect(comparisonAnalysis.analyze).toHaveBeenCalledTimes(1);
      expect(comparisonAnalysis.analyze).toHaveBeenCalledWith(COMPARISON_ID);
      expect(repository.findComparison).toHaveBeenCalledWith(COMPARISON_ID);
      expect(prisma.lesionObservation.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(response.data).toMatchObject({
        id: COMPARISON_ID,
        status: LesionComparisonStatus.READY_FOR_REVIEW,
      });
    });
  });

  describe('clinician review consistency', () => {
    beforeEach(() => {
      prisma.patient.findUnique.mockResolvedValue(patientRow({ primaryDoctorId: DOCTOR_ID }));
      repository.findComparisonAccess.mockResolvedValue({
        id: COMPARISON_ID,
        lesionId: LESION_ID,
        status: LesionComparisonStatus.READY_FOR_REVIEW,
        requestedById: DOCTOR_ID,
        lesion: {
          patientId: PATIENT_ID,
          organizationId: ORGANIZATION_ID,
          responsibleClinicianId: DOCTOR_ID,
        },
      });
      repository.findComparison.mockResolvedValue(
        comparisonRow({
          status: LesionComparisonStatus.READY_FOR_REVIEW,
          failureReason: null,
          analysis: { metrics: [] },
        }),
      );
    });

    it.each([
      {
        decision: LesionReviewDecision.CONFIRMED,
        clinicalAssessment: LesionClinicalAssessment.IMPROVING,
      },
      {
        decision: LesionReviewDecision.REJECTED,
        clinicalAssessment: LesionClinicalAssessment.WORSENING,
      },
    ])(
      'rejects a contradictory recapture review ($decision / $clinicalAssessment)',
      async ({ decision, clinicalAssessment }) => {
        await expect(
          service.reviewComparison(
            principal('doctor', DOCTOR_ID),
            COMPARISON_ID,
            {
              decision,
              clinicalAssessment,
              comment: 'Ảnh không đủ điều kiện để kết luận.',
              reason: 'Cần chụp lại',
              requestRecapture: true,
            },
            {},
          ),
        ).rejects.toMatchObject({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ code: 'INCONSISTENT_RECAPTURE_REVIEW' }),
          ]),
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );
  });
});
