CREATE TABLE "ai_skin_analysis_cases" (
    "id" UUID NOT NULL,
    "patient_id" UUID,
    "actor_id" UUID NOT NULL,
    "organization_id" UUID,
    "status" TEXT NOT NULL,
    "body_region" TEXT NOT NULL,
    "duration_days" INTEGER,
    "symptom_snapshot" JSONB NOT NULL,
    "image_metadata" JSONB NOT NULL,
    "aggregate_output" JSONB NOT NULL,
    "triage_output" JSONB NOT NULL,
    "model_version" TEXT NOT NULL,
    "labels_version" TEXT NOT NULL,
    "preprocessing_version" TEXT NOT NULL,
    "labels_configured" BOOLEAN NOT NULL,
    "reviewer_decision" TEXT,
    "reviewer_diagnosis" TEXT,
    "reviewer_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "generated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_skin_analysis_cases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_skin_analysis_cases_status_check"
      CHECK ("status" IN ('completed', 'partial', 'abstained', 'failed')),
    CONSTRAINT "ai_skin_analysis_cases_review_decision_check"
      CHECK (
        "reviewer_decision" IS NULL OR
        "reviewer_decision" IN ('accepted', 'rejected', 'different_diagnosis', 'image_unsuitable')
      )
);

CREATE INDEX "ai_skin_analysis_cases_patient_id_generated_at_idx"
  ON "ai_skin_analysis_cases"("patient_id", "generated_at");

CREATE INDEX "ai_skin_analysis_cases_actor_id_generated_at_idx"
  ON "ai_skin_analysis_cases"("actor_id", "generated_at");
