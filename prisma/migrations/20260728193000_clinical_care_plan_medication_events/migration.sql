-- Evolve the thin clinical-plan / prescription snapshots without breaking
-- existing readers. No table or legacy column is dropped in this migration.

CREATE TYPE "ClinicalCarePlanStage" AS ENUM (
  'induction',
  'monitoring',
  'response_assessment',
  'maintenance'
);

CREATE TYPE "ClinicalPlanOrderKind" AS ENUM (
  'medication',
  'laboratory',
  'imaging',
  'procedure',
  'patient_education',
  'consultation'
);

CREATE TYPE "MedicationOrderEventType" AS ENUM (
  'prescribed',
  'dispensed',
  'administered',
  'adherence_confirmed',
  'adherence_note'
);

ALTER TABLE "clinical_plans"
  ADD COLUMN "measurable_goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "protocol_template_id" UUID,
  ADD COLUMN "protocol_template_version_id" UUID,
  ADD COLUMN "milestones" JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN "monitoring_metrics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "stop_or_change_criteria" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "contraindications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "responsible_provider_id" UUID,
  ADD COLUMN "deviation_from_protocol" JSONB,
  ADD COLUMN "outcome" TEXT,
  ADD COLUMN "current_stage" "ClinicalCarePlanStage" NOT NULL DEFAULT 'induction',
  ADD COLUMN "signed_by" UUID,
  ADD COLUMN "signed_at" TIMESTAMPTZ,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "clinical_plans"
SET
  "measurable_goals" = ARRAY["summary"],
  "responsible_provider_id" = "doctor_id",
  "signed_by" = "doctor_id",
  "signed_at" = "approved_at",
  "created_at" = "approved_at",
  "updated_at" = "approved_at";

ALTER TABLE "clinical_plans"
  ALTER COLUMN "responsible_provider_id" SET NOT NULL,
  ADD CONSTRAINT "clinical_plans_protocol_template_id_fkey"
    FOREIGN KEY ("protocol_template_id") REFERENCES "workflow_templates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_plans_protocol_template_version_id_fkey"
    FOREIGN KEY ("protocol_template_version_id") REFERENCES "workflow_template_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "clinical_plan_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actor_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_plan_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinical_plan_revisions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "clinical_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_plan_revisions_plan_id_version_key"
    UNIQUE ("plan_id", "version")
);

CREATE INDEX "clinical_plan_revisions_plan_id_occurred_at_idx"
  ON "clinical_plan_revisions"("plan_id", "occurred_at");

INSERT INTO "clinical_plan_revisions" (
  "plan_id",
  "version",
  "action",
  "snapshot",
  "actor_id",
  "occurred_at"
)
SELECT
  cp."id",
  1,
  'approved',
  jsonb_build_object(
    'id', cp."id",
    'encounterId', cp."encounter_id",
    'diagnosisId', cp."diagnosis_id",
    'summary', cp."summary",
    'measurableGoals', to_jsonb(cp."measurable_goals"),
    'monitoringMetrics', to_jsonb(cp."monitoring_metrics"),
    'currentStage', cp."current_stage",
    'responsibleProviderId', cp."responsible_provider_id",
    'signedBy', cp."signed_by",
    'signedAt', cp."signed_at"
  ),
  cp."doctor_id",
  cp."approved_at"
FROM "clinical_plans" cp;

CREATE TABLE "clinical_plan_order_refs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "kind" "ClinicalPlanOrderKind" NOT NULL,
  "reference_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_plan_order_refs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinical_plan_order_refs_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "clinical_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_plan_order_refs_plan_id_kind_reference_id_key"
    UNIQUE ("plan_id", "kind", "reference_id")
);

CREATE INDEX "clinical_plan_order_refs_reference_id_idx"
  ON "clinical_plan_order_refs"("reference_id");

ALTER TABLE "workflow_tasks"
  ADD COLUMN "related_order_id" UUID,
  ADD COLUMN "blocked_reason" TEXT,
  ADD COLUMN "evidence_of_completion" TEXT,
  ADD COLUMN "abnormal_result_flagged_at" TIMESTAMPTZ,
  ADD COLUMN "abnormal_result_escalated_to" UUID,
  ADD CONSTRAINT "workflow_tasks_related_order_id_fkey"
    FOREIGN KEY ("related_order_id") REFERENCES "clinical_orders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "workflow_tasks"
SET "blocked_reason" = "clinical_warning"
WHERE "clinical_warning" IS NOT NULL;

CREATE INDEX "workflow_tasks_related_order_id_idx"
  ON "workflow_tasks"("related_order_id");

CREATE TABLE "medication_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prescription_id" UUID NOT NULL,
  "encounter_id" UUID NOT NULL,
  "medication_name" TEXT NOT NULL,
  "dose" TEXT NOT NULL,
  "route" TEXT,
  "frequency" TEXT,
  "duration_days" INTEGER NOT NULL,
  "instructions" TEXT,
  "prescribed_by" UUID NOT NULL,
  "prescribed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medication_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medication_orders_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medication_orders_duration_days_check"
    CHECK ("duration_days" > 0)
);

CREATE INDEX "medication_orders_encounter_id_prescribed_at_idx"
  ON "medication_orders"("encounter_id", "prescribed_at");

CREATE INDEX "medication_orders_prescription_id_idx"
  ON "medication_orders"("prescription_id");

INSERT INTO "medication_orders" (
  "prescription_id",
  "encounter_id",
  "medication_name",
  "dose",
  "duration_days",
  "prescribed_by",
  "prescribed_at",
  "created_at"
)
SELECT
  p."id",
  p."encounter_id",
  medication.value ->> 'name',
  medication.value ->> 'dose',
  CASE
    WHEN medication.value ->> 'durationDays' ~ '^[0-9]+$'
      AND length(medication.value ->> 'durationDays') <= 9
      THEN GREATEST((medication.value ->> 'durationDays')::INTEGER, 1)
    ELSE 1
  END,
  p."doctor_id",
  p."issued_at",
  p."issued_at"
FROM "prescriptions" p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(p."medications") = 'array' THEN p."medications"
    ELSE '[]'::JSONB
  END
) AS medication(value)
WHERE
  medication.value ->> 'name' IS NOT NULL
  AND medication.value ->> 'dose' IS NOT NULL;

CREATE TABLE "medication_order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "type" "MedicationOrderEventType" NOT NULL,
  "actor_id" UUID NOT NULL,
  "notes" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medication_order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medication_order_events_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "medication_orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "medication_order_events_order_id_occurred_at_idx"
  ON "medication_order_events"("order_id", "occurred_at");

INSERT INTO "medication_order_events" (
  "order_id",
  "type",
  "actor_id",
  "occurred_at"
)
SELECT
  mo."id",
  'prescribed'::"MedicationOrderEventType",
  mo."prescribed_by",
  mo."prescribed_at"
FROM "medication_orders" mo;

CREATE OR REPLACE FUNCTION prevent_clinical_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is forbidden', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "clinical_plan_revisions_append_only"
BEFORE UPDATE OR DELETE ON "clinical_plan_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_history_mutation();

CREATE TRIGGER "medication_order_events_append_only"
BEFORE UPDATE OR DELETE ON "medication_order_events"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_history_mutation();
