ALTER TABLE "clinical_results"
ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "critical_reason" TEXT,
ADD COLUMN "acknowledged_at" TIMESTAMPTZ,
ADD COLUMN "acknowledged_by" UUID,
ADD COLUMN "acknowledgement_note" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "clinical_results"
ADD CONSTRAINT "clinical_results_critical_requires_abnormal_check"
CHECK (NOT "critical" OR "abnormal");

CREATE INDEX "clinical_results_unacknowledged_critical_idx"
ON "clinical_results" ("acknowledged_at")
WHERE "critical" = true AND "acknowledged_at" IS NULL;
