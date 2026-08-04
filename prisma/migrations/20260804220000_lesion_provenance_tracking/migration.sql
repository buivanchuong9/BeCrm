-- Additive-only migration: registration provenance, explicit legacy marker,
-- and mask provenance/correction linkage. No existing rows are touched here
-- (see the separate 20260804230000_lesion_legacy_backfill migration for the
-- one-time historical backfill, which is the higher-risk operation).

ALTER TABLE "lesion_comparison_analyses"
  ADD COLUMN "registration_provenance" JSONB,
  ADD COLUMN "is_legacy_classification" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "lesion_comparison_analyses"."registration_provenance" IS
  'Raw registration provenance from the analysis adapter (dx/dy, phase-correlation score, likelySameBodyRegion/likelySameLesion, requiresClinicianMaskReview). NULL when the adapter performed no registration.';

COMMENT ON COLUMN "lesion_comparison_analyses"."is_legacy_classification" IS
  'True only for analyses produced outside the current registered-pair pipeline. Distinct from the demo/isSimulated concept. Existing rows default false and are backfilled separately.';

CREATE TYPE "LesionMaskProvenance" AS ENUM (
  'MODEL_PROPOSED', 'CLINICIAN_DRAWN', 'CLINICIAN_CORRECTED', 'CLINICIAN_CONFIRMED'
);

ALTER TABLE "lesion_image_assets"
  ADD COLUMN "mask_provenance" "LesionMaskProvenance",
  ADD COLUMN "corrects_asset_id" UUID;

COMMENT ON COLUMN "lesion_image_assets"."mask_provenance" IS
  'Provenance for MASK-type rows only. NULL for non-MASK types and for MASK rows written before this column existed (unknown provenance, not AI-proposed).';

COMMENT ON COLUMN "lesion_image_assets"."corrects_asset_id" IS
  'Self-reference to the prior asset this row confirms or corrects. Distinct from original_asset_id, which always points at the source photo. Append-only: a correction is always a new row.';

ALTER TABLE "lesion_image_assets"
  ADD CONSTRAINT "lesion_image_assets_corrects_asset_id_fkey"
  FOREIGN KEY ("corrects_asset_id") REFERENCES "lesion_image_assets"("id") ON DELETE RESTRICT;

CREATE INDEX "lesion_image_assets_corrects_asset_id_idx"
  ON "lesion_image_assets"("corrects_asset_id");
