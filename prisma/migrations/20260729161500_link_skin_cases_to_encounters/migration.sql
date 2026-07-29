ALTER TABLE "ai_skin_analysis_cases"
  ADD COLUMN "encounter_id" UUID;

ALTER TABLE "ai_skin_analysis_cases"
  ADD CONSTRAINT "ai_skin_analysis_cases_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_skin_analysis_cases"
  ADD CONSTRAINT "ai_skin_analysis_cases_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ai_skin_analysis_cases_encounter_id_generated_at_idx"
  ON "ai_skin_analysis_cases"("encounter_id", "generated_at");

CREATE TABLE "ai_skin_analysis_artifacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_skin_analysis_artifacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_skin_analysis_artifacts_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "ai_skin_analysis_cases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_skin_analysis_artifacts_kind_check"
    CHECK ("kind" IN ('review_original', 'heatmap')),
  CONSTRAINT "ai_skin_analysis_artifacts_role_check"
    CHECK ("role" IN ('overview', 'closeup', 'alternate'))
);

CREATE UNIQUE INDEX "ai_skin_analysis_artifacts_case_id_role_kind_key"
  ON "ai_skin_analysis_artifacts"("case_id", "role", "kind");

CREATE INDEX "ai_skin_analysis_artifacts_case_id_idx"
  ON "ai_skin_analysis_artifacts"("case_id");
