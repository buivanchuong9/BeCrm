-- Migration: queue_persistent_source_truth
-- Adds sourceType, clinicDate, atomic queue counter, cancel/no_show statuses.
-- Existing walk-in tickets are backfilled as source_type='appointment' (they
-- were created with a synthetic appointment record) — the new walk-in flow
-- (sourceType='walk_in') applies only to tickets created after this migration.
--
-- DEPLOYMENT NOTES:
--   1. Backfills clinic_date from issued_at before adding NOT NULL constraint.
--   2. Unique constraint on (clinic_location_id, clinic_date, department, number)
--      is added after a deduplication pass that appends _{n} to duplicate numbers
--      in historical data (idempotent if already unique).
--   3. Run `prisma generate` after applying this migration.
--   4. Do NOT run against production automatically — coordinate with on-call.

-- Step 1: Extend QueueTicketStatus with terminal states.
ALTER TYPE "QueueTicketStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "QueueTicketStatus" ADD VALUE IF NOT EXISTS 'no_show';

-- Step 2: Create QueueTicketSource enum.
DO $$ BEGIN
  CREATE TYPE "QueueTicketSource" AS ENUM ('appointment', 'walk_in');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Create atomic daily queue counter table.
CREATE TABLE IF NOT EXISTS "daily_queue_counters" (
    "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    "organization_id"    UUID        NOT NULL,
    "clinic_location_id" UUID        NOT NULL,
    "clinic_date"        DATE        NOT NULL,
    "department"         TEXT        NOT NULL,
    "last_number"        INTEGER     NOT NULL DEFAULT 0,
    "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "daily_queue_counters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_queue_counters_clinic_location_id_clinic_date_dept_key"
        UNIQUE ("clinic_location_id", "clinic_date", "department"),
    CONSTRAINT "daily_queue_counters_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
    CONSTRAINT "daily_queue_counters_clinic_location_id_fkey"
        FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE RESTRICT
);

-- Step 4: Add new columns to queue_tickets (all nullable initially).
ALTER TABLE "queue_tickets"
    ADD COLUMN IF NOT EXISTS "source_type"   "QueueTicketSource" DEFAULT 'appointment',
    ADD COLUMN IF NOT EXISTS "clinic_date"   DATE,
    ADD COLUMN IF NOT EXISTS "check_in_id"   UUID,
    ADD COLUMN IF NOT EXISTS "skipped_at"    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "cancelled_at"  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "no_show_at"    TIMESTAMPTZ;

-- Step 5: Drop NOT NULL on appointment_id and encounter_id to support walk-ins.
ALTER TABLE "queue_tickets"
    ALTER COLUMN "appointment_id" DROP NOT NULL,
    ALTER COLUMN "encounter_id"   DROP NOT NULL;

-- Step 6: Backfill clinic_date from issued_at (truncate to date in UTC).
UPDATE "queue_tickets"
SET "clinic_date" = DATE("issued_at")
WHERE "clinic_date" IS NULL;

-- Step 7: Make clinic_date and source_type NOT NULL now that they are filled.
ALTER TABLE "queue_tickets"
    ALTER COLUMN "clinic_date"  SET NOT NULL,
    ALTER COLUMN "source_type"  SET NOT NULL;

-- Step 8: Remove the old DEFAULT so Prisma controls it in application code.
ALTER TABLE "queue_tickets"
    ALTER COLUMN "source_type" DROP DEFAULT;

-- Step 9: Deduplicate historical queue numbers before adding unique constraint.
-- Appends _2, _3 … to any duplicate (clinic_location_id, clinic_date,
-- department, number) combinations preserving the earliest-issued_at record.
WITH ranked AS (
    SELECT
        id,
        number,
        ROW_NUMBER() OVER (
            PARTITION BY clinic_location_id, clinic_date, department, number
            ORDER BY issued_at ASC, id ASC
        ) AS rn
    FROM queue_tickets
)
UPDATE queue_tickets
SET number = ranked.number || '_' || ranked.rn
FROM ranked
WHERE queue_tickets.id = ranked.id
  AND ranked.rn > 1;

-- Step 10: Add unique constraint on queue number within scope.
ALTER TABLE "queue_tickets"
    ADD CONSTRAINT "queue_tickets_clinic_location_clinic_date_dept_number_key"
    UNIQUE ("clinic_location_id", "clinic_date", "department", "number");

-- Step 11: Add new indexes.
CREATE INDEX IF NOT EXISTS "queue_tickets_loc_date_status_idx"
    ON "queue_tickets" ("clinic_location_id", "clinic_date", "status");

CREATE INDEX IF NOT EXISTS "queue_tickets_loc_date_dept_status_idx"
    ON "queue_tickets" ("clinic_location_id", "clinic_date", "department", "status");

CREATE INDEX IF NOT EXISTS "queue_tickets_encounter_id_idx"
    ON "queue_tickets" ("encounter_id");

CREATE INDEX IF NOT EXISTS "queue_tickets_check_in_id_idx"
    ON "queue_tickets" ("check_in_id");

CREATE INDEX IF NOT EXISTS "queue_tickets_patient_id_idx"
    ON "queue_tickets" ("patient_id");
