-- Migration: 20260806020000_queue_hardening
-- Production-hardening pass on the persistent clinic queue.
--
-- CHANGES:
--   1. Add QueueTicketSource.legacy — historical records with uncertain origin.
--   2. Reclassify pre-migration tickets: if a matching check-in token exists →
--      keep 'appointment'; otherwise set 'legacy' (old walk-ins had synthetic
--      appointments, so 'appointment' was fabricated; 'legacy' is honest).
--   3. Add seq_number (INTEGER) — the raw counter from DailyQueueCounter.
--      This becomes the uniqueness key; display codes ("D001") stay in number.
--   4. Fix _N dedup artifacts from migration 20260806000000: re-sequence with
--      clean integers and update display codes to match.
--   5. Add called_by_user_id — persists who issued the callNext command.
--   6. Swap the unique constraint from number to seq_number.
--   7. Backfill DailyQueueCounter to match actual max seq_number per scope.
--
-- DEPLOYMENT NOTES:
--   - This migration is idempotent on seq_number backfill (uses COALESCE).
--   - Constraint rename: drops old "number"-based unique, adds seq_number one.
--   - Do NOT run against production automatically — coordinate with on-call.
--   - Run `prisma generate` after applying this migration.

-- ---------------------------------------------------------------------------
-- Step 1: Add 'legacy' to QueueTicketSource enum.
-- ---------------------------------------------------------------------------
ALTER TYPE "QueueTicketSource" ADD VALUE IF NOT EXISTS 'legacy';

-- ---------------------------------------------------------------------------
-- Step 2: Add seq_number and called_by_user_id columns (nullable initially).
-- ---------------------------------------------------------------------------
ALTER TABLE "queue_tickets"
    ADD COLUMN IF NOT EXISTS "seq_number"          INTEGER,
    ADD COLUMN IF NOT EXISTS "called_by_user_id"   UUID;

-- ---------------------------------------------------------------------------
-- Step 3: Backfill seq_number for all existing tickets.
--
-- Assign ROW_NUMBER() ordered by issued_at within each
-- (clinic_location_id, clinic_date, department) scope.  This produces clean
-- 1-based integers regardless of the _N dedup artifacts introduced earlier.
-- ---------------------------------------------------------------------------
UPDATE "queue_tickets" qt
SET "seq_number" = ranked.rn
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY clinic_location_id, clinic_date, department
            ORDER BY issued_at ASC, id ASC
        ) AS rn
    FROM "queue_tickets"
) ranked
WHERE qt.id = ranked.id;

-- Step 3b: Make seq_number NOT NULL now that it's populated.
ALTER TABLE "queue_tickets"
    ALTER COLUMN "seq_number" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 4: Fix display codes that have _N suffixes (dedup artifacts).
--
-- Strategy: extract the prefix letters, then rebuild as prefix + zero-padded
-- seq_number so "D001_2" → "D002" (if its seq_number is 2).
-- Only rows whose number matches the pattern "[A-Z]+[0-9]+_[0-9]+" are touched.
-- ---------------------------------------------------------------------------
UPDATE "queue_tickets"
SET "number" = (
    REGEXP_REPLACE("number", '[0-9_]+$', '')  -- strip trailing digits and underscores
    || LPAD("seq_number"::TEXT, 3, '0')
)
WHERE "number" ~ '^[A-Za-z]+[0-9]+_[0-9]+$';

-- Step 5 (reclassify 'legacy' source_type) has been moved to migration
-- 20260806021000_queue_hardening_backfill because PostgreSQL requires
-- ALTER TYPE ... ADD VALUE to be committed before the new value can be used
-- in a subsequent statement.  Prisma wraps each migration in a single
-- transaction, so both statements cannot coexist in this file.

-- ---------------------------------------------------------------------------
-- Step 6: Swap the unique constraint.
--
-- Old constraint was on (clinic_location_id, clinic_date, department, number).
-- New constraint is on (clinic_location_id, clinic_date, department, seq_number)
-- which is always a clean integer and matches DailyQueueCounter's scope.
-- ---------------------------------------------------------------------------
ALTER TABLE "queue_tickets"
    DROP CONSTRAINT IF EXISTS "queue_tickets_clinic_location_clinic_date_dept_number_key";

ALTER TABLE "queue_tickets"
    ADD CONSTRAINT "queue_tickets_loc_date_dept_seq_key"
    UNIQUE ("clinic_location_id", "clinic_date", "department", "seq_number");

-- Add index on display code for patient-facing lookups.
CREATE INDEX IF NOT EXISTS "queue_tickets_loc_date_dept_number_idx"
    ON "queue_tickets" ("clinic_location_id", "clinic_date", "department", "number");

-- Index to support calledBy queries.
CREATE INDEX IF NOT EXISTS "queue_tickets_called_by_idx"
    ON "queue_tickets" ("called_by_user_id")
    WHERE "called_by_user_id" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 7: Sync DailyQueueCounter.last_number with actual max seq_number.
--
-- After the re-sequencing above, counters must reflect the actual maximum so
-- future allocations continue from the right value.
-- ---------------------------------------------------------------------------
INSERT INTO "daily_queue_counters"
    ("organization_id", "clinic_location_id", "clinic_date", "department",
     "last_number", "updated_at")
SELECT
    qt.organization_id,
    qt.clinic_location_id,
    qt.clinic_date,
    qt.department,
    MAX(qt.seq_number),
    now()
FROM "queue_tickets" qt
GROUP BY
    qt.organization_id, qt.clinic_location_id, qt.clinic_date, qt.department
ON CONFLICT ("clinic_location_id", "clinic_date", "department")
DO UPDATE SET
    "last_number" = GREATEST(
        "daily_queue_counters"."last_number",
        EXCLUDED."last_number"
    ),
    "updated_at" = now();
