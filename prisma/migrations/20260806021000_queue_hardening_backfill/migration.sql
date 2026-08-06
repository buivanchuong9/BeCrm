-- Migration: 20260806021000_queue_hardening_backfill
--
-- This migration MUST run after 20260806020000_queue_hardening has been
-- committed.  It uses the 'legacy' enum value that was added by that
-- migration.  PostgreSQL requires the ADD VALUE transaction to be committed
-- before a new transaction can reference the value — so this step lives in
-- its own migration file.
--
-- Reclassify historical source_type:
--   Old walk-ins had a synthetic appointment record and were classified as
--   'appointment' in migration 20260806000000.  Tickets that have NO matching
--   appointment_check_in_tokens row are reclassified to 'legacy' to signal
--   uncertain provenance.  Tickets WITH a matching token remain 'appointment'
--   (they were genuine QR check-ins).

UPDATE "queue_tickets" qt
SET "source_type" = 'legacy'
WHERE qt.source_type = 'appointment'
  AND qt.check_in_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "appointment_check_in_tokens" ack
      WHERE ack.appointment_id = qt.appointment_id
  );
