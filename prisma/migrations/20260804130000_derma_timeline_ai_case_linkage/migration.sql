-- Links each lesion observation to the (optionally cached) AI skin-analysis
-- case computed for it by RealImageAnalysisAdapter, so repeat comparisons
-- reuse an existing AI result instead of re-spending the patient's AI usage
-- quota. Also records the AI service's reported model name on
-- ai_skin_analysis_cases, which was previously read from the response but
-- never persisted.

ALTER TABLE "ai_skin_analysis_cases"
  ADD COLUMN "model" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE "lesion_observations"
  ADD COLUMN "ai_skin_analysis_case_id" UUID;

ALTER TABLE "lesion_observations"
  ADD CONSTRAINT "lesion_observations_ai_skin_analysis_case_id_key" UNIQUE ("ai_skin_analysis_case_id");

ALTER TABLE "lesion_observations"
  ADD CONSTRAINT "lesion_observations_ai_skin_analysis_case_id_fkey"
  FOREIGN KEY ("ai_skin_analysis_case_id") REFERENCES "ai_skin_analysis_cases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
