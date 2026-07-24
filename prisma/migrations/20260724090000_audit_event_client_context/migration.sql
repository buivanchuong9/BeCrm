-- Adds the columns needed for the client-reported audit event contract
-- (POST /audit/client-events): a severity classification, the originating
-- FE module label, and an encounter id for cross-referencing alongside the
-- existing patientId/resourceId columns. All nullable — existing rows and
-- every other AuditService.write() call site are unaffected.
ALTER TABLE "audit_events" ADD COLUMN "encounter_id" UUID;
ALTER TABLE "audit_events" ADD COLUMN "severity" TEXT;
ALTER TABLE "audit_events" ADD COLUMN "source_module" TEXT;

CREATE INDEX "audit_events_encounter_id_occurred_at_idx" ON "audit_events"("encounter_id", "occurred_at");
