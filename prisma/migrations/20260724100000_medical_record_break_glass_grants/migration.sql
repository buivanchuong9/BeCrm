-- Encounter/medical-record-scoped break-glass grants for clinical staff who
-- lack standing visibility into a specific encounter (e.g. covering an ER
-- shift). Distinct from break_glass_grants, which is the platform Owner's
-- patient-wide governance escape hatch.
CREATE TYPE "MedicalRecordBreakGlassStatus" AS ENUM ('active', 'ended', 'expired');

CREATE TABLE "medical_record_break_glass_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "medical_record_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "granted_to_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "MedicalRecordBreakGlassStatus" NOT NULL DEFAULT 'active',
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "medical_record_break_glass_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medical_record_break_glass_grants_granted_to_user_id_encoun_idx" ON "medical_record_break_glass_grants"("granted_to_user_id", "encounter_id", "status");
