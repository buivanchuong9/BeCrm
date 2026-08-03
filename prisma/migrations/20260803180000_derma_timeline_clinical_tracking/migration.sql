-- Longitudinal dermatology lesion tracking (DermaTimeline).
-- Clinical evidence is retained as immutable/revisioned data. Operational
-- projections (lesions, comparison jobs, adverse events) remain updateable.

CREATE TYPE "LesionLaterality" AS ENUM (
  'LEFT', 'RIGHT', 'MIDLINE', 'UNKNOWN'
);

CREATE TYPE "LesionStatus" AS ENUM (
  'ACTIVE', 'RESOLVED', 'ARCHIVED'
);

CREATE TYPE "LesionClinicalAssessment" AS ENUM (
  'IMPROVING', 'STABLE', 'WORSENING', 'INDETERMINATE'
);

CREATE TYPE "LesionReviewState" AS ENUM (
  'AI_SUGGESTION',
  'AWAITING_CLINICIAN_REVIEW',
  'CLINICIAN_CONFIRMED',
  'CLINICIAN_MODIFIED',
  'CLINICIAN_REJECTED',
  'UNABLE_TO_DETERMINE'
);

CREATE TYPE "LesionObservationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PROCESSING',
  'READY_FOR_REVIEW',
  'VERIFIED',
  'REJECTED',
  'NEEDS_RECAPTURE'
);

CREATE TYPE "LesionImageQualityStatus" AS ENUM (
  'ACCEPTABLE', 'CAUTION', 'UNUSABLE'
);

CREATE TYPE "LesionImageAssetType" AS ENUM (
  'ORIGINAL', 'THUMBNAIL', 'ALIGNED', 'MASK', 'HEATMAP', 'DIFFERENCE_MAP'
);

CREATE TYPE "LesionMetricCategory" AS ENUM (
  'MORPHOLOGY',
  'INFLAMMATION',
  'SYMPTOM',
  'FUNCTION',
  'TREATMENT',
  'IMAGE_QUALITY',
  'OTHER'
);

CREATE TYPE "LesionMetricSource" AS ENUM (
  'IMAGE_ANALYSIS',
  'PATIENT_REPORTED',
  'CLINICIAN_REPORTED',
  'DEVICE',
  'IMPORTED'
);

CREATE TYPE "LesionMetricVerificationStatus" AS ENUM (
  'PRELIMINARY', 'VERIFIED', 'AMENDED', 'REJECTED', 'ENTERED_IN_ERROR'
);

CREATE TYPE "LesionComparisonStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'NEEDS_RECAPTURE',
  'READY_FOR_REVIEW'
);

CREATE TYPE "LesionAnalysisType" AS ENUM (
  'CLINICAL_DATA_DELTA', 'IMAGE_ANALYSIS', 'HYBRID'
);

CREATE TYPE "LesionRegistrationQuality" AS ENUM (
  'GOOD', 'FAIR', 'POOR', 'UNAVAILABLE'
);

CREATE TYPE "LesionComparisonDisposition" AS ENUM (
  'COMPARABLE', 'CAUTION', 'NOT_COMPARABLE', 'UNAVAILABLE'
);

CREATE TYPE "LesionMetricInterpretation" AS ENUM (
  'IMPROVED', 'STABLE', 'WORSENED', 'INDETERMINATE', 'NOT_APPLICABLE'
);

CREATE TYPE "LesionReviewDecision" AS ENUM (
  'CONFIRMED', 'MODIFIED', 'REJECTED'
);

CREATE TYPE "DermatologyAdverseEventSeverity" AS ENUM (
  'MILD', 'MODERATE', 'SEVERE', 'UNKNOWN'
);

CREATE TYPE "DermatologyAdverseEventUrgency" AS ENUM (
  'ROUTINE', 'SOON', 'URGENT', 'EMERGENCY'
);

CREATE TYPE "DermatologyAdverseEventCausality" AS ENUM (
  'UNASSESSED', 'UNLIKELY', 'POSSIBLE', 'PROBABLE', 'INDETERMINATE'
);

CREATE TYPE "DermatologyAdverseEventClinicianStatus" AS ENUM (
  'PENDING_REVIEW', 'REVIEWED'
);

CREATE TYPE "DermatologyAdverseEventStatus" AS ENUM (
  'OPEN', 'RESOLVED', 'DISMISSED'
);

CREATE TABLE "lesions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body_region" TEXT NOT NULL,
  "body_map_coordinates" JSONB,
  "laterality" "LesionLaterality" NOT NULL DEFAULT 'UNKNOWN',
  "diagnosis" TEXT,
  "diagnosis_code" TEXT,
  "first_observed_at" TIMESTAMPTZ NOT NULL,
  "status" "LesionStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_id" UUID NOT NULL,
  "created_by_name_snapshot" TEXT NOT NULL,
  "responsible_clinician_id" UUID,
  "responsible_clinician_name_snapshot" TEXT,
  "current_treatment" TEXT,
  "current_assessment" "LesionClinicalAssessment" NOT NULL DEFAULT 'INDETERMINATE',
  "review_state" "LesionReviewState" NOT NULL DEFAULT 'UNABLE_TO_DETERMINE',
  "clinician_selected_baseline_id" UUID,
  "suspected_adverse_event" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "lesions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesions_code_not_blank_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "lesions_title_not_blank_check" CHECK (btrim("title") <> ''),
  CONSTRAINT "lesions_body_region_not_blank_check" CHECK (btrim("body_region") <> ''),
  CONSTRAINT "lesions_created_by_name_not_blank_check"
    CHECK (btrim("created_by_name_snapshot") <> ''),
  CONSTRAINT "lesions_version_positive_check" CHECK ("version" > 0)
);

CREATE TABLE "lesion_observations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesion_id" UUID NOT NULL,
  "encounter_id" UUID,
  "revision_of_id" UUID,
  "captured_at" TIMESTAMPTZ NOT NULL,
  "captured_by_id" UUID NOT NULL,
  "captured_by_name_snapshot" TEXT NOT NULL,
  "patient_reported_symptoms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "clinician_notes" TEXT,
  "treatment_context" TEXT,
  "image_quality_status" "LesionImageQualityStatus" NOT NULL DEFAULT 'CAUTION',
  "image_quality_reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "LesionObservationStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "lesion_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_observations_revision_of_id_key" UNIQUE ("revision_of_id"),
  CONSTRAINT "lesion_observations_revision_positive_check" CHECK ("revision" > 0),
  CONSTRAINT "lesion_observations_not_self_revision_check"
    CHECK ("revision_of_id" IS NULL OR "revision_of_id" <> "id"),
  CONSTRAINT "lesion_observations_captured_by_name_not_blank_check"
    CHECK (btrim("captured_by_name_snapshot") <> '')
);

CREATE TABLE "lesion_observation_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "observation_id" UUID NOT NULL,
  "supersedes_metric_id" UUID,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" "LesionMetricCategory" NOT NULL,
  "value" DECIMAL(14,4) NOT NULL,
  "unit" TEXT NOT NULL,
  "source" "LesionMetricSource" NOT NULL,
  "measurement_method" TEXT,
  "observed_at" TIMESTAMPTZ NOT NULL,
  "confidence" DECIMAL(5,4),
  "verification_status" "LesionMetricVerificationStatus" NOT NULL DEFAULT 'PRELIMINARY',
  "performer_id" UUID NOT NULL,
  "verified_by_id" UUID,
  "verified_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_observation_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_observation_metrics_supersedes_metric_id_key"
    UNIQUE ("supersedes_metric_id"),
  CONSTRAINT "lesion_observation_metrics_observation_id_code_key"
    UNIQUE ("observation_id", "code"),
  CONSTRAINT "lesion_observation_metrics_code_not_blank_check"
    CHECK (btrim("code") <> ''),
  CONSTRAINT "lesion_observation_metrics_label_not_blank_check"
    CHECK (btrim("label") <> ''),
  CONSTRAINT "lesion_observation_metrics_unit_not_blank_check"
    CHECK (btrim("unit") <> ''),
  CONSTRAINT "lesion_observation_metrics_confidence_check"
    CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1),
  CONSTRAINT "lesion_observation_metrics_not_self_superseding_check"
    CHECK ("supersedes_metric_id" IS NULL OR "supersedes_metric_id" <> "id"),
  CONSTRAINT "lesion_observation_metrics_verification_check" CHECK (
    (
      "verification_status" = 'PRELIMINARY'
      AND "verified_by_id" IS NULL
      AND "verified_at" IS NULL
    )
    OR
    (
      "verification_status" <> 'PRELIMINARY'
      AND "verified_by_id" IS NOT NULL
      AND "verified_at" IS NOT NULL
      AND "verified_at" >= "created_at"
    )
  )
);

CREATE TABLE "lesion_image_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "observation_id" UUID NOT NULL,
  "upload_object_id" UUID NOT NULL,
  "original_asset_id" UUID,
  "type" "LesionImageAssetType" NOT NULL DEFAULT 'ORIGINAL',
  "mime_type" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "file_size" INTEGER,
  "checksum" TEXT,
  "captured_at" TIMESTAMPTZ NOT NULL,
  "quality_metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_image_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_image_assets_upload_object_id_key" UNIQUE ("upload_object_id"),
  CONSTRAINT "lesion_image_assets_not_self_derived_check"
    CHECK ("original_asset_id" IS NULL OR "original_asset_id" <> "id"),
  CONSTRAINT "lesion_image_assets_dimensions_check" CHECK (
    ("width" IS NULL OR "width" > 0)
    AND ("height" IS NULL OR "height" > 0)
    AND ("file_size" IS NULL OR "file_size" > 0)
  ),
  CONSTRAINT "lesion_image_assets_mime_type_not_blank_check"
    CHECK (btrim("mime_type") <> '')
);

CREATE TABLE "lesion_comparison_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesion_id" UUID NOT NULL,
  "baseline_observation_id" UUID NOT NULL,
  "target_observation_id" UUID NOT NULL,
  "status" "LesionComparisonStatus" NOT NULL DEFAULT 'QUEUED',
  "requested_by_id" UUID NOT NULL,
  "requested_by_name_snapshot" TEXT NOT NULL,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "failure_reason" TEXT,
  "analysis_version" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "timeout_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "lesion_comparison_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_comparison_sessions_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "lesion_comparison_sessions_distinct_observations_check"
    CHECK ("baseline_observation_id" <> "target_observation_id"),
  CONSTRAINT "lesion_comparison_sessions_attempts_check"
    CHECK ("max_attempts" > 0 AND "attempt_count" BETWEEN 0 AND "max_attempts"),
  CONSTRAINT "lesion_comparison_sessions_requested_by_name_not_blank_check"
    CHECK (btrim("requested_by_name_snapshot") <> ''),
  CONSTRAINT "lesion_comparison_sessions_idempotency_key_not_blank_check"
    CHECK (btrim("idempotency_key") <> ''),
  CONSTRAINT "lesion_comparison_sessions_timestamp_order_check" CHECK (
    ("processing_started_at" IS NULL OR "processing_started_at" >= "requested_at")
    AND ("completed_at" IS NULL OR "completed_at" >= COALESCE("processing_started_at", "requested_at"))
    AND ("timeout_at" IS NULL OR "timeout_at" > "requested_at")
  )
);

CREATE TABLE "lesion_comparison_analyses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "comparison_session_id" UUID NOT NULL,
  "analysis_type" "LesionAnalysisType" NOT NULL,
  "model_name" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "algorithm_version" TEXT NOT NULL,
  "confidence" DECIMAL(5,4),
  "assessment" "LesionClinicalAssessment" NOT NULL,
  "visual_change_summary" TEXT NOT NULL,
  "limitations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "comparability_score" INTEGER,
  "sharpness" INTEGER,
  "lighting_consistency" INTEGER,
  "angle_consistency" INTEGER,
  "scale_consistency" INTEGER,
  "occlusion" INTEGER,
  "registration_quality" "LesionRegistrationQuality" NOT NULL DEFAULT 'UNAVAILABLE',
  "comparison_disposition" "LesionComparisonDisposition" NOT NULL DEFAULT 'UNAVAILABLE',
  "quality_policy_version" TEXT,
  "quality_reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "evidence" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_comparison_analyses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_comparison_analyses_comparison_session_id_key"
    UNIQUE ("comparison_session_id"),
  CONSTRAINT "lesion_comparison_analyses_confidence_check"
    CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1),
  CONSTRAINT "lesion_comparison_analyses_quality_scores_check" CHECK (
    ("comparability_score" IS NULL OR "comparability_score" BETWEEN 0 AND 100)
    AND ("sharpness" IS NULL OR "sharpness" BETWEEN 0 AND 100)
    AND ("lighting_consistency" IS NULL OR "lighting_consistency" BETWEEN 0 AND 100)
    AND ("angle_consistency" IS NULL OR "angle_consistency" BETWEEN 0 AND 100)
    AND ("scale_consistency" IS NULL OR "scale_consistency" BETWEEN 0 AND 100)
    AND ("occlusion" IS NULL OR "occlusion" BETWEEN 0 AND 100)
  ),
  CONSTRAINT "lesion_comparison_analyses_provenance_not_blank_check" CHECK (
    btrim("model_name") <> ''
    AND btrim("model_version") <> ''
    AND btrim("algorithm_version") <> ''
  )
);

CREATE TABLE "lesion_comparison_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "analysis_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" "LesionMetricCategory" NOT NULL,
  "baseline" DECIMAL(14,4),
  "current" DECIMAL(14,4),
  "delta" DECIMAL(14,4),
  "unit" TEXT NOT NULL,
  "source" "LesionMetricSource" NOT NULL,
  "baseline_source" "LesionMetricSource",
  "current_source" "LesionMetricSource",
  "baseline_observed_at" TIMESTAMPTZ,
  "current_observed_at" TIMESTAMPTZ,
  "measurement_method" TEXT,
  "missing_reason" TEXT,
  "confidence" DECIMAL(5,4),
  "interpretation" "LesionMetricInterpretation" NOT NULL DEFAULT 'INDETERMINATE',
  "interpretation_policy_id" TEXT,
  "interpretation_policy_version" TEXT,
  "clinician_verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_comparison_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_comparison_metrics_analysis_id_key_key" UNIQUE ("analysis_id", "key"),
  CONSTRAINT "lesion_comparison_metrics_text_not_blank_check"
    CHECK (btrim("key") <> '' AND btrim("label") <> '' AND btrim("unit") <> ''),
  CONSTRAINT "lesion_comparison_metrics_confidence_check"
    CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1),
  CONSTRAINT "lesion_comparison_metrics_delta_check" CHECK (
    "delta" IS NULL
    OR (
      "baseline" IS NOT NULL
      AND "current" IS NOT NULL
      AND "delta" = "current" - "baseline"
    )
  )
);

CREATE TABLE "lesion_clinician_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "comparison_session_id" UUID NOT NULL,
  "reviewer_id" UUID NOT NULL,
  "reviewer_name_snapshot" TEXT NOT NULL,
  "decision" "LesionReviewDecision" NOT NULL,
  "clinical_assessment" "LesionClinicalAssessment" NOT NULL,
  "corrected_metrics" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "comment" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "image_limitations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recapture_requested" BOOLEAN NOT NULL DEFAULT false,
  "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_clinician_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_clinician_reviews_reviewer_name_not_blank_check"
    CHECK (btrim("reviewer_name_snapshot") <> ''),
  CONSTRAINT "lesion_clinician_reviews_reason_not_blank_check"
    CHECK (btrim("reason") <> '')
);

CREATE TABLE "lesion_timeline_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesion_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "related_id" UUID,
  "warning" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesion_timeline_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesion_timeline_events_text_not_blank_check" CHECK (
    btrim("type") <> ''
    AND btrim("title") <> ''
    AND btrim("summary") <> ''
    AND btrim("source") <> ''
  )
);

CREATE TABLE "dermatology_adverse_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "lesion_id" UUID,
  "suspected_medication_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "onset_at" TIMESTAMPTZ NOT NULL,
  "symptoms" TEXT[] NOT NULL,
  "severity" "DermatologyAdverseEventSeverity" NOT NULL DEFAULT 'UNKNOWN',
  "urgency_level" "DermatologyAdverseEventUrgency" NOT NULL DEFAULT 'ROUTINE',
  "causality_status" "DermatologyAdverseEventCausality" NOT NULL DEFAULT 'UNASSESSED',
  "clinician_status" "DermatologyAdverseEventClinicianStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "status" "DermatologyAdverseEventStatus" NOT NULL DEFAULT 'OPEN',
  "created_by_id" UUID NOT NULL,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "dermatology_adverse_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dermatology_adverse_events_symptoms_not_empty_check"
    CHECK (cardinality("symptoms") > 0),
  CONSTRAINT "dermatology_adverse_events_version_positive_check"
    CHECK ("version" > 0),
  CONSTRAINT "dermatology_adverse_events_review_check" CHECK (
    (
      "clinician_status" = 'PENDING_REVIEW'
      AND "reviewed_by_id" IS NULL
      AND "reviewed_at" IS NULL
    )
    OR
    (
      "clinician_status" = 'REVIEWED'
      AND "reviewed_by_id" IS NOT NULL
      AND "reviewed_at" IS NOT NULL
    )
  )
);

-- Indexes mirror the Prisma @@unique/@@index declarations. Cursor-facing
-- indexes include the deterministic columns used by their query ordering.
CREATE UNIQUE INDEX "lesions_patient_id_code_key"
  ON "lesions"("patient_id", "code");
CREATE INDEX "lesions_organization_id_status_updated_at_idx"
  ON "lesions"("organization_id", "status", "updated_at");
CREATE INDEX "lesions_patient_id_status_updated_at_idx"
  ON "lesions"("patient_id", "status", "updated_at");

CREATE INDEX "lesion_observations_lesion_id_captured_at_idx"
  ON "lesion_observations"("lesion_id", "captured_at");
CREATE INDEX "lesion_observations_encounter_id_idx"
  ON "lesion_observations"("encounter_id");
CREATE INDEX "lesion_observations_status_updated_at_idx"
  ON "lesion_observations"("status", "updated_at");

CREATE INDEX "lesion_observation_metrics_code_observed_at_idx"
  ON "lesion_observation_metrics"("code", "observed_at");

CREATE INDEX "lesion_image_assets_patient_id_captured_at_idx"
  ON "lesion_image_assets"("patient_id", "captured_at");
CREATE INDEX "lesion_image_assets_observation_id_type_idx"
  ON "lesion_image_assets"("observation_id", "type");

CREATE INDEX "lesion_comparison_sessions_lesion_id_requested_at_idx"
  ON "lesion_comparison_sessions"("lesion_id", "requested_at");
CREATE INDEX "lesion_comparison_sessions_status_updated_at_idx"
  ON "lesion_comparison_sessions"("status", "updated_at");
CREATE INDEX "lesion_comparison_sessions_baseline_observation_id_target_o_idx"
  ON "lesion_comparison_sessions"("baseline_observation_id", "target_observation_id");

CREATE INDEX "lesion_clinician_reviews_comparison_session_id_reviewed_at_idx"
  ON "lesion_clinician_reviews"("comparison_session_id", "reviewed_at");

CREATE INDEX "lesion_timeline_events_lesion_id_occurred_at_id_idx"
  ON "lesion_timeline_events"("lesion_id", "occurred_at", "id");

CREATE INDEX "dermatology_adverse_events_patient_id_status_onset_at_idx"
  ON "dermatology_adverse_events"("patient_id", "status", "onset_at");
CREATE INDEX "dermatology_adverse_events_organization_id_clinician_status_idx"
  ON "dermatology_adverse_events"("organization_id", "clinician_status", "urgency_level");

-- Relations declared in schema.prisma. Actor and organization snapshot ids
-- intentionally remain scalar provenance fields where the schema defines no
-- Prisma relation; this avoids inventing deletion semantics in the migration.
ALTER TABLE "lesions"
  ADD CONSTRAINT "lesions_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_observations"
  ADD CONSTRAINT "lesion_observations_lesion_id_fkey"
  FOREIGN KEY ("lesion_id") REFERENCES "lesions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_observations_encounter_id_fkey"
  FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_observations_revision_of_id_fkey"
  FOREIGN KEY ("revision_of_id") REFERENCES "lesion_observations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesions"
  ADD CONSTRAINT "lesions_clinician_selected_baseline_id_fkey"
  FOREIGN KEY ("clinician_selected_baseline_id") REFERENCES "lesion_observations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lesion_observation_metrics"
  ADD CONSTRAINT "lesion_observation_metrics_observation_id_fkey"
  FOREIGN KEY ("observation_id") REFERENCES "lesion_observations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_observation_metrics_supersedes_metric_id_fkey"
  FOREIGN KEY ("supersedes_metric_id") REFERENCES "lesion_observation_metrics"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_image_assets"
  ADD CONSTRAINT "lesion_image_assets_observation_id_fkey"
  FOREIGN KEY ("observation_id") REFERENCES "lesion_observations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_image_assets_upload_object_id_fkey"
  FOREIGN KEY ("upload_object_id") REFERENCES "upload_objects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_image_assets_original_asset_id_fkey"
  FOREIGN KEY ("original_asset_id") REFERENCES "lesion_image_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_comparison_sessions"
  ADD CONSTRAINT "lesion_comparison_sessions_lesion_id_fkey"
  FOREIGN KEY ("lesion_id") REFERENCES "lesions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_comparison_sessions_baseline_observation_id_fkey"
  FOREIGN KEY ("baseline_observation_id") REFERENCES "lesion_observations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lesion_comparison_sessions_target_observation_id_fkey"
  FOREIGN KEY ("target_observation_id") REFERENCES "lesion_observations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_comparison_analyses"
  ADD CONSTRAINT "lesion_comparison_analyses_comparison_session_id_fkey"
  FOREIGN KEY ("comparison_session_id") REFERENCES "lesion_comparison_sessions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_comparison_metrics"
  ADD CONSTRAINT "lesion_comparison_metrics_analysis_id_fkey"
  FOREIGN KEY ("analysis_id") REFERENCES "lesion_comparison_analyses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_clinician_reviews"
  ADD CONSTRAINT "lesion_clinician_reviews_comparison_session_id_fkey"
  FOREIGN KEY ("comparison_session_id") REFERENCES "lesion_comparison_sessions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesion_timeline_events"
  ADD CONSTRAINT "lesion_timeline_events_lesion_id_fkey"
  FOREIGN KEY ("lesion_id") REFERENCES "lesions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dermatology_adverse_events"
  ADD CONSTRAINT "dermatology_adverse_events_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "dermatology_adverse_events_lesion_id_fkey"
  FOREIGN KEY ("lesion_id") REFERENCES "lesions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Platform defaults only; organizations can still override them through the
-- existing feature-flag service. These rows are idempotent for environments
-- that provision flags ahead of application migrations.
INSERT INTO "feature_flags" (
  "key", "description", "enabled_default", "created_at", "updated_at"
)
VALUES
  (
    'derma_timeline',
    'Longitudinal dermatology lesion tracking and clinical comparison workspace.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'derma_timeline_clinician_review',
    'Clinician review and correction workflow for DermaTimeline comparisons.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'derma_timeline_adverse_event_screening',
    'Dermatology suspected adverse-event recording and clinician review.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'derma_timeline_comparison_heatmap',
    'Validated image heatmap and difference-map rendering in DermaTimeline.',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;

-- Generic append-only guard for clinical evidence/history rows. This protects
-- against accidental mutation through application bugs and direct SQL.
CREATE OR REPLACE FUNCTION prevent_derma_append_only_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lesion_image_assets_append_only"
  BEFORE UPDATE OR DELETE ON "lesion_image_assets"
  FOR EACH ROW EXECUTE FUNCTION prevent_derma_append_only_mutation();

CREATE TRIGGER "lesion_comparison_analyses_append_only"
  BEFORE UPDATE OR DELETE ON "lesion_comparison_analyses"
  FOR EACH ROW EXECUTE FUNCTION prevent_derma_append_only_mutation();

CREATE TRIGGER "lesion_clinician_reviews_append_only"
  BEFORE UPDATE OR DELETE ON "lesion_clinician_reviews"
  FOR EACH ROW EXECUTE FUNCTION prevent_derma_append_only_mutation();

CREATE TRIGGER "lesion_timeline_events_append_only"
  BEFORE UPDATE OR DELETE ON "lesion_timeline_events"
  FOR EACH ROW EXECUTE FUNCTION prevent_derma_append_only_mutation();

-- A verified observation is a signed clinical snapshot. Corrections must be a
-- new row linked through revision_of_id; updates/deletes of the signed row are
-- rejected at the database boundary.
CREATE OR REPLACE FUNCTION prevent_verified_lesion_observation_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'VERIFIED' THEN
    RAISE EXCEPTION 'verified lesion observation % is immutable: % is not permitted', OLD."id", TG_OP
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lesion_observations_verified_immutable"
  BEFORE UPDATE OR DELETE ON "lesion_observations"
  FOR EACH ROW EXECUTE FUNCTION prevent_verified_lesion_observation_mutation();

-- Observation metric values/provenance are never edited in place. A
-- preliminary row may only transition its verification fields; subsequent
-- corrections use supersedes_metric_id and leave the original intact.
CREATE OR REPLACE FUNCTION protect_lesion_observation_metric_history()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'lesion observation metrics are append-only: DELETE is not permitted'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD."verification_status" <> 'PRELIMINARY' THEN
    RAISE EXCEPTION 'finalized lesion observation metric % is immutable', OLD."id"
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."observation_id" IS DISTINCT FROM OLD."observation_id"
    OR NEW."supersedes_metric_id" IS DISTINCT FROM OLD."supersedes_metric_id"
    OR NEW."code" IS DISTINCT FROM OLD."code"
    OR NEW."label" IS DISTINCT FROM OLD."label"
    OR NEW."category" IS DISTINCT FROM OLD."category"
    OR NEW."value" IS DISTINCT FROM OLD."value"
    OR NEW."unit" IS DISTINCT FROM OLD."unit"
    OR NEW."source" IS DISTINCT FROM OLD."source"
    OR NEW."measurement_method" IS DISTINCT FROM OLD."measurement_method"
    OR NEW."observed_at" IS DISTINCT FROM OLD."observed_at"
    OR NEW."confidence" IS DISTINCT FROM OLD."confidence"
    OR NEW."performer_id" IS DISTINCT FROM OLD."performer_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION 'lesion observation metric values/provenance are immutable; create an amendment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lesion_observation_metrics_history_guard"
  BEFORE UPDATE OR DELETE ON "lesion_observation_metrics"
  FOR EACH ROW EXECUTE FUNCTION protect_lesion_observation_metric_history();

-- AI comparison metrics are immutable output. The only allowed update is a
-- one-way false -> true clinician verification marker; the review itself is
-- retained separately in lesion_clinician_reviews.
CREATE OR REPLACE FUNCTION protect_lesion_comparison_metric_output()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'lesion comparison metrics are append-only: DELETE is not permitted'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD."clinician_verified" THEN
    RAISE EXCEPTION 'clinician-verified comparison metric % is immutable', OLD."id"
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."analysis_id" IS DISTINCT FROM OLD."analysis_id"
    OR NEW."key" IS DISTINCT FROM OLD."key"
    OR NEW."label" IS DISTINCT FROM OLD."label"
    OR NEW."category" IS DISTINCT FROM OLD."category"
    OR NEW."baseline" IS DISTINCT FROM OLD."baseline"
    OR NEW."current" IS DISTINCT FROM OLD."current"
    OR NEW."delta" IS DISTINCT FROM OLD."delta"
    OR NEW."unit" IS DISTINCT FROM OLD."unit"
    OR NEW."source" IS DISTINCT FROM OLD."source"
    OR NEW."baseline_source" IS DISTINCT FROM OLD."baseline_source"
    OR NEW."current_source" IS DISTINCT FROM OLD."current_source"
    OR NEW."baseline_observed_at" IS DISTINCT FROM OLD."baseline_observed_at"
    OR NEW."current_observed_at" IS DISTINCT FROM OLD."current_observed_at"
    OR NEW."measurement_method" IS DISTINCT FROM OLD."measurement_method"
    OR NEW."missing_reason" IS DISTINCT FROM OLD."missing_reason"
    OR NEW."confidence" IS DISTINCT FROM OLD."confidence"
    OR NEW."interpretation" IS DISTINCT FROM OLD."interpretation"
    OR NEW."interpretation_policy_id" IS DISTINCT FROM OLD."interpretation_policy_id"
    OR NEW."interpretation_policy_version" IS DISTINCT FROM OLD."interpretation_policy_version"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
    OR NEW."clinician_verified" IS NOT TRUE
  THEN
    RAISE EXCEPTION 'AI comparison metric output is immutable'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lesion_comparison_metrics_output_guard"
  BEFORE UPDATE OR DELETE ON "lesion_comparison_metrics"
  FOR EACH ROW EXECUTE FUNCTION protect_lesion_comparison_metric_output();
