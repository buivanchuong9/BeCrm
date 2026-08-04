-- One-time historical backfill of is_legacy_classification (added, always
-- false by default, in 20260804220000_lesion_provenance_tracking).
--
-- lesion_comparison_analyses is append-only (trigger
-- lesion_comparison_analyses_append_only -> prevent_derma_append_only_mutation,
-- see 20260803180000_derma_timeline_clinical_tracking). That trigger is
-- unconditional and has no prior exception carved out anywhere in this
-- migration history. This migration is the one place that temporarily lifts
-- it, inside a single transaction, strictly to backfill this one column on
-- pre-existing rows -- it must not be used as a precedent for any other kind
-- of retroactive edit.
--
-- Scope of the UPDATE: only rows where image-derived analysis actually ran
-- (analysis_type IN ('IMAGE_ANALYSIS', 'HYBRID')) but did not come from the
-- current registered-pair pipeline or the seeded demo adapter. This
-- intentionally excludes CLINICAL_DATA_DELTA rows (no image analysis was
-- ever attempted for those -- "unavailable" is not "legacy") and demo rows
-- (isSimulated is the correct, separate marker for those).

DROP TRIGGER "lesion_comparison_analyses_append_only" ON "lesion_comparison_analyses";

UPDATE "lesion_comparison_analyses"
SET "is_legacy_classification" = true
WHERE "analysis_type" IN ('IMAGE_ANALYSIS', 'HYBRID')
  AND "model_name" <> 'derma-timeline-demo-analysis'
  AND NOT (
    "model_name" LIKE '%semi-automatic-lesion-progress%'
    AND "quality_policy_version" LIKE 'lesion-comparability/%'
  );

CREATE TRIGGER "lesion_comparison_analyses_append_only"
  BEFORE UPDATE OR DELETE ON "lesion_comparison_analyses"
  FOR EACH ROW EXECUTE FUNCTION prevent_derma_append_only_mutation();
