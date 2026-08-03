import 'dotenv/config';
import { createHash } from 'crypto';
import { LesionMetricSource, LesionMetricVerificationStatus, PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { validateEnv } from '../src/core/configuration/env.validation';
import { AppConfiguration, buildConfiguration } from '../src/core/configuration/configuration';
import { ObjectStorageService } from '../src/core/storage/object-storage.service';
import {
  DEMO_BASELINE_LESION_RADIUS,
  DEMO_BASELINE_OBSERVATION_ID,
  DEMO_IMAGE_SIZE,
  DEMO_LESION_CODE,
  DEMO_LESION_ID,
  DEMO_PATIENT_CODE,
  DEMO_TARGET_LESION_RADIUS,
  DEMO_TARGET_OBSERVATION_ID,
} from '../src/modules/lesion-tracking/analysis-adapters/demo-seed.constants';
import { lesionPhoto } from '../src/modules/lesion-tracking/analysis-adapters/png-fixture';

/**
 * Seeds the single approved DermaTimeline demo case: one patient, one active
 * lesion, and two VERIFIED observations with real ORIGINAL image assets
 * (deterministic synthetic PNGs — see png-fixture.ts). Deliberately does
 * NOT create the ComparisonSession/ComparisonAnalysis/derived assets —
 * those are produced by the normal POST /lesions/:id/comparisons →
 * DemoImageAnalysisAdapter code path the first time anyone (a test, a
 * developer in the UI) requests a comparison for this lesion, exactly like
 * a real patient's data would be.
 *
 * Requires scripts/seed-demo-doctors.ts to have run first (same
 * organization/clinic/department + demo doctor accounts).
 *
 * Reuses ObjectStorageService directly (constructed from real env config,
 * bypassing Nest's DI container so this script doesn't have to boot the
 * whole AppModule) so demo images go through the exact same storage path
 * production code uses — never base64-in-DB, never a bespoke uploader.
 *
 * Idempotent: safe to run repeatedly; skips creation if the demo lesion
 * already exists.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-demo-derma-timeline.ts
 */
const prisma = new PrismaClient();

const ORG_CODE = process.env.ORG_CODE?.trim() || 'dermahealth';
const DEMO_DOCTOR_SLUG = process.env.DEMO_DOCTOR_SLUG?.trim();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  const organization = await prisma.organization.findUnique({ where: { code: ORG_CODE } });
  if (!organization) {
    throw new Error(`Organization "${ORG_CODE}" not found. Run scripts/seed-demo-doctors.ts first.`);
  }

  const doctor = DEMO_DOCTOR_SLUG
    ? await prisma.user.findUnique({ where: { email: `bs.${DEMO_DOCTOR_SLUG}@demo.dermahealth.vn` } })
    : await prisma.user.findFirst({
        where: { email: { endsWith: '@demo.dermahealth.vn' } },
        orderBy: { createdAt: 'asc' },
      });
  if (!doctor) {
    throw new Error(
      'No demo doctor account found. Run scripts/seed-demo-doctors.ts first (or set DEMO_DOCTOR_SLUG).',
    );
  }

  let patient = await prisma.patient.findFirst({
    where: { organizationId: organization.id, code: DEMO_PATIENT_CODE },
  });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        organizationId: organization.id,
        code: DEMO_PATIENT_CODE,
        name: 'Bệnh nhân minh hoạ DermaTimeline',
        dob: new Date('1990-01-01'),
        gender: 'female',
        phone: '0900000000',
        email: 'demo.dermatimeline@example.dermahealth.vn',
        address: 'Dữ liệu minh hoạ — không phải bệnh nhân thật',
        bloodType: 'unknown',
        primaryDoctorId: doctor.id,
      },
    });
  }

  await prisma.consent.upsert({
    where: { patientId_type: { patientId: patient.id, type: 'data_processing' } },
    update: {},
    create: {
      patientId: patient.id,
      type: 'data_processing',
      policyVersion: '1.0',
      granted: true,
      grantedAt: new Date(),
    },
  });

  const existingCareTeam = await prisma.patientCareTeamMember.findFirst({
    where: { patientId: patient.id, userId: doctor.id, relationship: 'primary_doctor' },
  });
  if (!existingCareTeam) {
    await prisma.patientCareTeamMember.create({
      data: { patientId: patient.id, userId: doctor.id, relationship: 'primary_doctor' },
    });
  }

  const config = new ConfigService<AppConfiguration, true>(
    buildConfiguration(validateEnv(process.env as Record<string, unknown>)),
  );
  const storage = new ObjectStorageService(config);

  const baselineCapturedAt = daysAgo(30);
  const targetCapturedAt = daysAgo(2);

  let lesion = await prisma.lesion.findUnique({ where: { id: DEMO_LESION_ID } });
  if (!lesion) {
    lesion = await prisma.lesion.create({
      data: {
        id: DEMO_LESION_ID,
        patientId: patient.id,
        organizationId: organization.id,
        code: DEMO_LESION_CODE,
        title: 'Mảng viêm da minh hoạ (demo)',
        bodyRegion: 'Cẳng tay trái',
        laterality: 'LEFT',
        diagnosis: 'Viêm da cơ địa (dữ liệu minh hoạ)',
        firstObservedAt: baselineCapturedAt,
        status: 'ACTIVE',
        createdById: doctor.id,
        createdByNameSnap: doctor.displayName,
        responsibleClinicianId: doctor.id,
        responsibleClinicianNameSnap: doctor.displayName,
        currentTreatment: 'Corticosteroid bôi tại chỗ nhẹ, 2 lần/ngày',
        currentAssessment: 'IMPROVING',
        reviewState: 'AI_SUGGESTION',
      },
    });
    await prisma.lesionTimelineEvent.create({
      data: {
        lesionId: lesion.id,
        occurredAt: baselineCapturedAt,
        type: 'OBSERVATION',
        title: 'Bắt đầu theo dõi tổn thương (demo)',
        summary: 'Hồ sơ minh hoạ được tạo để trình diễn DermaTimeline; không phải bệnh nhân thật.',
        source: 'SYSTEM',
        relatedId: lesion.id,
      },
    });
  }

  const existingBaseline = await prisma.lesionObservation.findUnique({
    where: { id: DEMO_BASELINE_OBSERVATION_ID },
  });
  if (!existingBaseline) {
    await seedObservation({
      id: DEMO_BASELINE_OBSERVATION_ID,
      lesionId: lesion.id,
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: doctor.displayName,
      capturedAt: baselineCapturedAt,
      lesionRadius: DEMO_BASELINE_LESION_RADIUS,
      itchScore: 8,
      painScore: 3,
      treatmentContext: null,
      symptoms: ['Ngứa', 'Đỏ da'],
      storage,
    });
  }

  const existingTarget = await prisma.lesionObservation.findUnique({
    where: { id: DEMO_TARGET_OBSERVATION_ID },
  });
  if (!existingTarget) {
    await seedObservation({
      id: DEMO_TARGET_OBSERVATION_ID,
      lesionId: lesion.id,
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: doctor.displayName,
      capturedAt: targetCapturedAt,
      lesionRadius: DEMO_TARGET_LESION_RADIUS,
      itchScore: 4,
      painScore: 1,
      treatmentContext: 'Đã bôi corticosteroid nhẹ 2 lần/ngày trong 28 ngày.',
      symptoms: ['Ngứa nhẹ'],
      storage,
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded DermaTimeline demo lesion ${DEMO_LESION_CODE} for patient ${DEMO_PATIENT_CODE}.\n` +
      `Enable it via the derma_timeline_demo_analysis feature flag for organization ${organization.id},\n` +
      `then create a comparison between the two observations to see the simulated analysis.`,
  );
}

async function seedObservation(params: {
  id: string;
  lesionId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  capturedAt: Date;
  lesionRadius: number;
  itchScore: number;
  painScore: number;
  treatmentContext: string | null;
  symptoms: string[];
  storage: ObjectStorageService;
}) {
  const bytes = lesionPhoto(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, params.lesionRadius);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const storageKey = `derived/lesion-tracking/demo-seed/${params.id}/original.png`;
  await params.storage.putObject(storageKey, 'image/png', bytes);

  const upload =
    (await prisma.uploadObject.findUnique({ where: { storageKey } })) ??
    (await prisma.uploadObject.create({
      data: {
        ownerId: params.doctorId,
        fileName: `${params.id}-original.png`,
        contentType: 'image/png',
        context: 'lesion-image',
        storageKey,
        fileHash: checksum,
        status: 'confirmed',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60_000),
        confirmedAt: new Date(),
      },
    }));

  await prisma.$transaction(async (tx) => {
    const observation = await tx.lesionObservation.create({
      data: {
        id: params.id,
        lesionId: params.lesionId,
        capturedAt: params.capturedAt,
        capturedById: params.doctorId,
        capturedByNameSnap: params.doctorName,
        patientReportedSymptoms: params.symptoms,
        clinicianNotes: 'Ảnh và số liệu là dữ liệu minh hoạ cố định cho mục đích demo.',
        treatmentContext: params.treatmentContext,
        imageQualityStatus: 'ACCEPTABLE',
        imageQualityReasons: [],
        status: 'VERIFIED',
        revision: 1,
        metrics: {
          create: [
            {
              code: 'itch-nrs-24h',
              label: 'Ngứa NRS (24 giờ)',
              category: 'SYMPTOM',
              value: params.itchScore,
              unit: '{score}',
              source: LesionMetricSource.CLINICIAN_REPORTED,
              measurementMethod: 'Thang NRS 0–10 do người bệnh tự báo cáo, ghi nhận bởi bác sĩ (demo)',
              observedAt: params.capturedAt,
              verificationStatus: LesionMetricVerificationStatus.VERIFIED,
              performerId: params.doctorId,
              verifiedById: params.doctorId,
              verifiedAt: new Date(Date.now() + 60_000),
            },
            {
              code: 'pain-nrs-24h',
              label: 'Đau NRS (24 giờ)',
              category: 'SYMPTOM',
              value: params.painScore,
              unit: '{score}',
              source: LesionMetricSource.CLINICIAN_REPORTED,
              measurementMethod: 'Thang NRS 0–10 do người bệnh tự báo cáo, ghi nhận bởi bác sĩ (demo)',
              observedAt: params.capturedAt,
              verificationStatus: LesionMetricVerificationStatus.VERIFIED,
              performerId: params.doctorId,
              verifiedById: params.doctorId,
              verifiedAt: new Date(Date.now() + 60_000),
            },
          ],
        },
        imageAssets: {
          create: [
            {
              patientId: params.patientId,
              uploadObjectId: upload.id,
              type: 'ORIGINAL',
              mimeType: 'image/png',
              width: DEMO_IMAGE_SIZE,
              height: DEMO_IMAGE_SIZE,
              fileSize: bytes.length,
              checksum,
              capturedAt: params.capturedAt,
            },
          ],
        },
      },
    });
    await tx.lesionTimelineEvent.create({
      data: {
        lesionId: params.lesionId,
        occurredAt: params.capturedAt,
        type: 'OBSERVATION',
        title: 'Lần theo dõi minh hoạ đã sẵn sàng',
        summary: `Đã lưu ảnh gốc và ${params.symptoms.length} triệu chứng (demo).`,
        source: 'SYSTEM',
        relatedId: observation.id,
      },
    });
    if (params.treatmentContext) {
      await tx.lesionTimelineEvent.create({
        data: {
          lesionId: params.lesionId,
          occurredAt: params.capturedAt,
          type: 'TREATMENT',
          title: 'Đã ghi nhận bối cảnh điều trị (demo)',
          summary: params.treatmentContext,
          source: 'SYSTEM',
          relatedId: observation.id,
        },
      });
    }
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
