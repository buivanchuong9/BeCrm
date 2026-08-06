-- Migration: 20260806010000_lifetime_clinical_models
-- Adds AllergyIntolerance, VitalObservation, PatientProfileNarrative tables
-- to support real longitudinal electronic medical records (bệnh án trọn đời).

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------

CREATE TYPE "AllergyVerificationStatus" AS ENUM (
  'patient_reported',
  'clinician_verified',
  'unverified'
);

CREATE TYPE "AllergyCategory" AS ENUM (
  'medication',
  'food',
  'environment',
  'contact',
  'biologic',
  'other'
);

CREATE TYPE "AllergySeverity" AS ENUM (
  'mild',
  'moderate',
  'severe',
  'life_threatening'
);

CREATE TYPE "VitalType" AS ENUM (
  'height_cm',
  'weight_kg',
  'bmi',
  'systolic_bp',
  'diastolic_bp',
  'heart_rate',
  'respiratory_rate',
  'temperature_c',
  'spo2',
  'blood_glucose'
);

-- ---------------------------------------------------------------------------
-- allergy_intolerances
-- ---------------------------------------------------------------------------

CREATE TABLE "allergy_intolerances" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"          UUID         NOT NULL,
  "category"            "AllergyCategory"           NOT NULL DEFAULT 'other',
  "substance"           TEXT         NOT NULL,
  "substance_code"      TEXT,
  "reaction"            TEXT,
  "severity"            "AllergySeverity",
  "onset_date"          DATE,
  "verification_status" "AllergyVerificationStatus" NOT NULL DEFAULT 'patient_reported',
  "verified_by_user_id" UUID,
  "verified_at"         TIMESTAMPTZ,
  "note"                TEXT,
  "active"              BOOLEAN      NOT NULL DEFAULT TRUE,
  "recorded_by_user_id" UUID,
  "recorded_at"         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ  NOT NULL,

  CONSTRAINT "allergy_intolerances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "allergy_intolerances_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
  CONSTRAINT "allergy_intolerances_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "allergy_intolerances_recorded_by_user_id_fkey"
    FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "allergy_intolerances_patient_id_active_idx"
  ON "allergy_intolerances" ("patient_id", "active");

-- ---------------------------------------------------------------------------
-- vital_observations
-- ---------------------------------------------------------------------------

CREATE TABLE "vital_observations" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"          UUID         NOT NULL,
  "encounter_id"        UUID,
  "type"                "VitalType"  NOT NULL,
  "value"               DECIMAL(8,2) NOT NULL,
  "unit"                TEXT         NOT NULL,
  "recorded_at"         TIMESTAMPTZ  NOT NULL,
  "recorded_by_user_id" UUID,
  "note"                TEXT,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "vital_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vital_observations_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
  CONSTRAINT "vital_observations_encounter_id_fkey"
    FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE SET NULL,
  CONSTRAINT "vital_observations_recorded_by_user_id_fkey"
    FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "vital_observations_patient_id_type_recorded_at_idx"
  ON "vital_observations" ("patient_id", "type", "recorded_at");

-- ---------------------------------------------------------------------------
-- patient_profile_narratives
-- ---------------------------------------------------------------------------

CREATE TABLE "patient_profile_narratives" (
  "patient_id"       UUID        NOT NULL,
  "chief_complaint"  TEXT,
  "medical_history"  TEXT,
  "family_history"   TEXT,
  "social_history"   TEXT,
  "current_symptoms" TEXT,
  "lifestyle"        TEXT,
  "occupation"       TEXT,
  "updated_at"       TIMESTAMPTZ NOT NULL,
  "updated_by_user_id" UUID,

  CONSTRAINT "patient_profile_narratives_pkey" PRIMARY KEY ("patient_id"),
  CONSTRAINT "patient_profile_narratives_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
  CONSTRAINT "patient_profile_narratives_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Backfill: seed vital observations from existing Patient.height_cm / weight_kg
-- Any patient with stored measurements gets a synthetic "recorded_at = created_at"
-- observation row so the time-series chart starts populated.
-- ---------------------------------------------------------------------------

INSERT INTO "vital_observations" ("id", "patient_id", "type", "value", "unit", "recorded_at", "created_at")
SELECT
  gen_random_uuid(),
  id,
  'height_cm'::"VitalType",
  height_cm,
  'cm',
  created_at,
  now()
FROM "patients"
WHERE height_cm IS NOT NULL;

INSERT INTO "vital_observations" ("id", "patient_id", "type", "value", "unit", "recorded_at", "created_at")
SELECT
  gen_random_uuid(),
  id,
  'weight_kg'::"VitalType",
  weight_kg,
  'kg',
  created_at,
  now()
FROM "patients"
WHERE weight_kg IS NOT NULL;
