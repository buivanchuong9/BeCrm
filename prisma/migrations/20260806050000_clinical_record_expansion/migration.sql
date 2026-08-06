-- Migration: 20260806050000_clinical_record_expansion
-- Adds PatientProblemListEntry and PatientCurrentMedication tables.
-- Extends patient_profile_narratives with surgical_history and vaccination_notes.

-- ---------------------------------------------------------------------------
-- Extend patient_profile_narratives
-- (organization_id was already added in 20260806040000_clinical_hardening)
-- ---------------------------------------------------------------------------

ALTER TABLE "patient_profile_narratives"
  ADD COLUMN IF NOT EXISTS "surgical_history"  TEXT,
  ADD COLUMN IF NOT EXISTS "vaccination_notes" TEXT;

-- ---------------------------------------------------------------------------
-- patient_problem_list_entries
-- ---------------------------------------------------------------------------

CREATE TABLE "patient_problem_list_entries" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"       UUID        NOT NULL,
  "organization_id"  UUID        NOT NULL,
  "condition_name"   TEXT        NOT NULL,
  "condition_code"   TEXT,
  "status"           TEXT        NOT NULL DEFAULT 'active',
  "onset_date"       DATE,
  "severity"         TEXT,
  "note"             TEXT,
  "added_by_user_id" UUID        NOT NULL,
  "added_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL,

  CONSTRAINT "patient_problem_list_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_problem_list_entries_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
  CONSTRAINT "patient_problem_list_entries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "patient_problem_list_entries_added_by_user_id_fkey"
    FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "patient_problem_list_entries_status_check"
    CHECK ("status" IN ('active', 'inactive', 'resolved'))
);

CREATE INDEX "patient_problem_list_entries_patient_id_status_idx"
  ON "patient_problem_list_entries" ("patient_id", "status");

-- ---------------------------------------------------------------------------
-- patient_current_medications
-- ---------------------------------------------------------------------------

CREATE TABLE "patient_current_medications" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "patient_id"       UUID        NOT NULL,
  "organization_id"  UUID        NOT NULL,
  "medication_name"  TEXT        NOT NULL,
  "dosage"           TEXT,
  "frequency"        TEXT,
  "route"            TEXT,
  "started_at"       DATE,
  "note"             TEXT,
  "active"           BOOLEAN     NOT NULL DEFAULT TRUE,
  "added_by_user_id" UUID        NOT NULL,
  "added_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL,

  CONSTRAINT "patient_current_medications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_current_medications_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
  CONSTRAINT "patient_current_medications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "patient_current_medications_added_by_user_id_fkey"
    FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX "patient_current_medications_patient_id_active_idx"
  ON "patient_current_medications" ("patient_id", "active");
