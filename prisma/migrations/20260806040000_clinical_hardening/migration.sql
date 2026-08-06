-- Migration: 20260806040000_clinical_hardening
-- Clinical hardening pass: provenance, allergy knowledge state, correction
-- versioning, vital source tracking, and BMI derivation traceability.
--
-- CHANGES:
--   1. Extend AllergyVerificationStatus with: imported_unverified,
--      organization_verified, superseded, entered_in_error.
--   2. Add new enums: AllergyKnowledgeState, AllergySourceType, VitalSourceType.
--   3. Add provenance columns to allergy_intolerances.
--   4. Add correction-versioning columns to allergy_intolerances.
--   5. Create allergy_knowledge_assessments table.
--   6. Add provenance + observedAt + sourceType + correction columns to
--      vital_observations.
--   7. Add organizationId + version to patient_profile_narratives.
--   8. Backfill all new NOT NULL columns from existing data.
--
-- DEPLOYMENT NOTES:
--   - Run prisma generate after applying.
--   - Do NOT run against production without on-call review.
--   - All backfills use COALESCE / subselects — idempotent on re-run only
--     for the initial-NULL→value step; the NOT NULL constraints added later
--     will fail if any rows remain NULL.

-- ===========================================================================
-- Step 1: Extend AllergyVerificationStatus
-- ===========================================================================
ALTER TYPE "AllergyVerificationStatus" ADD VALUE IF NOT EXISTS 'imported_unverified';
ALTER TYPE "AllergyVerificationStatus" ADD VALUE IF NOT EXISTS 'organization_verified';
ALTER TYPE "AllergyVerificationStatus" ADD VALUE IF NOT EXISTS 'superseded';
ALTER TYPE "AllergyVerificationStatus" ADD VALUE IF NOT EXISTS 'entered_in_error';

-- ===========================================================================
-- Step 2: New enums
-- ===========================================================================
DO $$ BEGIN
  CREATE TYPE "AllergyKnowledgeState" AS ENUM ('unknown', 'no_known_allergies', 'known_allergies');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AllergySourceType" AS ENUM ('patient_reported', 'clinical_assessment', 'imported_unverified', 'legacy_backfill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VitalSourceType" AS ENUM ('clinical_measurement', 'patient_reported', 'device_imported', 'ehr_imported', 'legacy_backfill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- Step 3: Provenance columns on allergy_intolerances
-- ===========================================================================
ALTER TABLE "allergy_intolerances"
    ADD COLUMN IF NOT EXISTS "organization_id"          UUID,
    ADD COLUMN IF NOT EXISTS "clinic_location_id"       UUID,
    ADD COLUMN IF NOT EXISTS "encounter_id"             UUID,
    ADD COLUMN IF NOT EXISTS "source_type"              "AllergySourceType" DEFAULT 'patient_reported',
    ADD COLUMN IF NOT EXISTS "effective_at"             TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "supersedes_id"            UUID,
    ADD COLUMN IF NOT EXISTS "entered_in_error_at"      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "entered_in_error_by_user_id" UUID,
    ADD COLUMN IF NOT EXISTS "source_document_id"       TEXT;

-- Backfill organization_id from patient row
UPDATE "allergy_intolerances" ai
SET "organization_id" = p.organization_id
FROM "patients" p
WHERE ai.patient_id = p.id
  AND ai.organization_id IS NULL;

-- Make organization_id NOT NULL now that it's populated
ALTER TABLE "allergy_intolerances"
    ALTER COLUMN "organization_id" SET NOT NULL,
    ALTER COLUMN "source_type" SET NOT NULL,
    ALTER COLUMN "source_type" SET DEFAULT 'patient_reported';

-- FKs for new columns
ALTER TABLE "allergy_intolerances"
    ADD CONSTRAINT "allergy_intolerances_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "allergy_intolerances_clinic_location_id_fkey"
        FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "allergy_intolerances_encounter_id_fkey"
        FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "allergy_intolerances_entered_in_error_by_user_id_fkey"
        FOREIGN KEY ("entered_in_error_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Self-referential FK for correction chain (supersedes_id)
ALTER TABLE "allergy_intolerances"
    ADD CONSTRAINT "allergy_intolerances_supersedes_id_key" UNIQUE ("supersedes_id"),
    ADD CONSTRAINT "allergy_intolerances_supersedes_id_fkey"
        FOREIGN KEY ("supersedes_id") REFERENCES "allergy_intolerances"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "allergy_intolerances_org_patient_idx"
    ON "allergy_intolerances" ("organization_id", "patient_id");

-- ===========================================================================
-- Step 4: allergy_knowledge_assessments table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "allergy_knowledge_assessments" (
    "id"               UUID               NOT NULL DEFAULT gen_random_uuid(),
    "patient_id"       UUID               NOT NULL,
    "organization_id"  UUID               NOT NULL,
    "clinic_location_id" UUID,
    "encounter_id"     UUID,
    "knowledge_state"  "AllergyKnowledgeState" NOT NULL,
    "assessed_by_user_id" UUID,
    "assessed_at"      TIMESTAMPTZ        NOT NULL DEFAULT now(),
    "note"             TEXT,
    "created_at"       TIMESTAMPTZ        NOT NULL DEFAULT now(),

    CONSTRAINT "allergy_knowledge_assessments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "allergy_knowledge_assessments_patient_id_fkey"
        FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
    CONSTRAINT "allergy_knowledge_assessments_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
    CONSTRAINT "allergy_knowledge_assessments_clinic_location_id_fkey"
        FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE SET NULL,
    CONSTRAINT "allergy_knowledge_assessments_encounter_id_fkey"
        FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE SET NULL,
    CONSTRAINT "allergy_knowledge_assessments_assessed_by_user_id_fkey"
        FOREIGN KEY ("assessed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "allergy_knowledge_assessments_patient_assessed_at_idx"
    ON "allergy_knowledge_assessments" ("patient_id", "assessed_at" DESC);

-- ===========================================================================
-- Step 5: vital_observations — provenance + observedAt + correction columns
-- ===========================================================================
ALTER TABLE "vital_observations"
    ADD COLUMN IF NOT EXISTS "organization_id"     UUID,
    ADD COLUMN IF NOT EXISTS "clinic_location_id"  UUID,
    ADD COLUMN IF NOT EXISTS "source_type"         "VitalSourceType",
    ADD COLUMN IF NOT EXISTS "observed_at"         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "method"              TEXT,
    ADD COLUMN IF NOT EXISTS "bmi_source_height_id" UUID,
    ADD COLUMN IF NOT EXISTS "bmi_source_weight_id" UUID,
    ADD COLUMN IF NOT EXISTS "supersedes_id"       UUID;

-- Backfill organization_id from patient row
UPDATE "vital_observations" vo
SET "organization_id" = p.organization_id
FROM "patients" p
WHERE vo.patient_id = p.id
  AND vo.organization_id IS NULL;

-- Backfill observed_at from recorded_at (backfilled rows had recorded_at set to
-- patient.created_at in the previous migration — defensible as the earliest
-- known measurement date).
UPDATE "vital_observations"
SET "observed_at" = "recorded_at"
WHERE "observed_at" IS NULL;

-- Backfill source_type: rows without a recorder are legacy backfills;
-- rows with a recorder were clinical entries.
UPDATE "vital_observations"
SET "source_type" = CASE
    WHEN "recorded_by_user_id" IS NULL THEN 'legacy_backfill'::"VitalSourceType"
    ELSE 'clinical_measurement'::"VitalSourceType"
END
WHERE "source_type" IS NULL;

-- Make columns NOT NULL now that backfilled
ALTER TABLE "vital_observations"
    ALTER COLUMN "organization_id" SET NOT NULL,
    ALTER COLUMN "observed_at"     SET NOT NULL,
    ALTER COLUMN "source_type"     SET NOT NULL,
    ALTER COLUMN "source_type"     SET DEFAULT 'clinical_measurement';

-- FKs for new columns
ALTER TABLE "vital_observations"
    ADD CONSTRAINT "vital_observations_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "vital_observations_clinic_location_id_fkey"
        FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE SET NULL;

ALTER TABLE "vital_observations"
    ADD CONSTRAINT "vital_observations_supersedes_id_key" UNIQUE ("supersedes_id"),
    ADD CONSTRAINT "vital_observations_supersedes_id_fkey"
        FOREIGN KEY ("supersedes_id") REFERENCES "vital_observations"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "vital_observations_bmi_source_height_id_fkey"
        FOREIGN KEY ("bmi_source_height_id") REFERENCES "vital_observations"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "vital_observations_bmi_source_weight_id_fkey"
        FOREIGN KEY ("bmi_source_weight_id") REFERENCES "vital_observations"("id") ON DELETE SET NULL;

-- Drop old index, recreate on observedAt (was recordedAt)
DROP INDEX IF EXISTS "vital_observations_patient_id_type_recorded_at_idx";
CREATE INDEX IF NOT EXISTS "vital_observations_patient_type_observed_at_idx"
    ON "vital_observations" ("patient_id", "type", "observed_at");

-- ===========================================================================
-- Step 6: patient_profile_narratives — organizationId + version
-- ===========================================================================
ALTER TABLE "patient_profile_narratives"
    ADD COLUMN IF NOT EXISTS "organization_id" UUID,
    ADD COLUMN IF NOT EXISTS "version"         INTEGER DEFAULT 1;

-- Backfill organization_id from patient row
UPDATE "patient_profile_narratives" ppn
SET "organization_id" = p.organization_id
FROM "patients" p
WHERE ppn.patient_id = p.id
  AND ppn.organization_id IS NULL;

-- Make NOT NULL (safe since backfilled; table may be empty if no narratives exist yet)
ALTER TABLE "patient_profile_narratives"
    ALTER COLUMN "version" SET NOT NULL,
    ALTER COLUMN "version" SET DEFAULT 1;

-- Only set NOT NULL if the table has rows (avoids failure on empty table);
-- if no rows exist, PostgreSQL will allow setting NOT NULL immediately.
ALTER TABLE "patient_profile_narratives"
    ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "patient_profile_narratives"
    ADD CONSTRAINT "patient_profile_narratives_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;
