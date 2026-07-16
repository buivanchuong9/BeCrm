-- CreateEnum
CREATE TYPE "KioskDeviceStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('video', 'in_person');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('upcoming', 'done', 'cancelled', 'missed');

-- CreateEnum
CREATE TYPE "CheckInTokenStatus" AS ENUM ('active', 'used', 'expired', 'revoked', 'replaced');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('standard', 'emergency', 'follow_up', 'remote');

-- CreateEnum
CREATE TYPE "EncounterOrigin" AS ENUM ('appointment', 'walk_in', 'follow_up_request');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('registered', 'intake_in_progress', 'intake_complete', 'ai_assessed', 'routed', 'checked_in', 'under_doctor_review', 'awaiting_results', 'diagnosed', 'plan_approved', 'workflow_active', 'in_progress', 'results_complete', 'final_review', 'discharge_ready', 'record_signed', 'closed', 'post_visit_monitoring', 'escalated', 'follow_up_linked');

-- CreateEnum
CREATE TYPE "EncounterEventKind" AS ENUM ('info', 'warning', 'success', 'danger');

-- CreateEnum
CREATE TYPE "QueueTicketPriority" AS ENUM ('normal', 'priority', 'urgent');

-- CreateEnum
CREATE TYPE "QueueTicketStatus" AS ENUM ('waiting', 'called', 'acknowledged', 'in_service', 'skipped', 'completed', 'routed');

-- CreateTable
CREATE TABLE "kiosk_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "clinic_location_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "status" "KioskDeviceStatus" NOT NULL DEFAULT 'active',
    "registered_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "kiosk_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "clinic_location_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "department" TEXT NOT NULL,
    "consultation_type" TEXT,
    "mode" "AppointmentMode" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'upcoming',
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "cancel_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_check_in_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinic_location_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "CheckInTokenStatus" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "used_by_device_id" UUID,
    "revoked_at" TIMESTAMPTZ,
    "revoked_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_check_in_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_encounters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "clinic_location_id" UUID,
    "patient_id" UUID NOT NULL,
    "parent_encounter_id" UUID,
    "appointment_id" UUID,
    "type" "EncounterType" NOT NULL,
    "origin" "EncounterOrigin" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'registered',
    "department" TEXT NOT NULL,
    "room" TEXT,
    "queue_number" TEXT,
    "people_ahead_in_queue" INTEGER,
    "estimated_wait_minutes" INTEGER,
    "current_doctor_id" UUID,
    "blocking_condition" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medical_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounter_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "kind" "EncounterEventKind" NOT NULL DEFAULT 'info',

    CONSTRAINT "encounter_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "clinic_location_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "service_station" TEXT NOT NULL,
    "room" TEXT,
    "waiting_area" TEXT NOT NULL,
    "priority" "QueueTicketPriority" NOT NULL DEFAULT 'normal',
    "status" "QueueTicketStatus" NOT NULL DEFAULT 'waiting',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "called_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "service_started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "next_station" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "queue_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kiosk_devices_clinic_location_id_idx" ON "kiosk_devices"("clinic_location_id");

-- CreateIndex
CREATE INDEX "appointments_organization_id_clinic_location_id_idx" ON "appointments"("organization_id", "clinic_location_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_start_at_idx" ON "appointments"("doctor_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_patient_id_start_at_idx" ON "appointments"("patient_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_check_in_tokens_token_hash_key" ON "appointment_check_in_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "appointment_check_in_tokens_appointment_id_idx" ON "appointment_check_in_tokens"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "medical_encounters_appointment_id_key" ON "medical_encounters"("appointment_id");

-- CreateIndex
CREATE INDEX "medical_encounters_organization_id_status_idx" ON "medical_encounters"("organization_id", "status");

-- CreateIndex
CREATE INDEX "medical_encounters_patient_id_updated_at_idx" ON "medical_encounters"("patient_id", "updated_at");

-- CreateIndex
CREATE INDEX "encounter_events_encounter_id_at_idx" ON "encounter_events"("encounter_id", "at");

-- CreateIndex
CREATE INDEX "queue_tickets_organization_id_clinic_location_id_department_idx" ON "queue_tickets"("organization_id", "clinic_location_id", "department", "status");

-- CreateIndex
CREATE INDEX "queue_tickets_appointment_id_idx" ON "queue_tickets"("appointment_id");

-- AddForeignKey
ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_clinic_location_id_fkey" FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_location_id_fkey" FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_check_in_tokens" ADD CONSTRAINT "appointment_check_in_tokens_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_check_in_tokens" ADD CONSTRAINT "appointment_check_in_tokens_used_by_device_id_fkey" FOREIGN KEY ("used_by_device_id") REFERENCES "kiosk_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_clinic_location_id_fkey" FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_parent_encounter_id_fkey" FOREIGN KEY ("parent_encounter_id") REFERENCES "medical_encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_encounters" ADD CONSTRAINT "medical_encounters_current_doctor_id_fkey" FOREIGN KEY ("current_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_events" ADD CONSTRAINT "encounter_events_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_clinic_location_id_fkey" FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- docs/api.md section 41 concurrency matrix: double-booking and duplicate-
-- ticket prevention cannot be expressed in Prisma's declarative schema (GiST
-- exclusion constraints, partial unique indexes referencing an expression),
-- so it is handwritten here, same pattern as the audit-immutability trigger
-- and membership partial unique indexes in earlier migrations.

-- Required for the "=" equality operator class used alongside "&&" (range
-- overlap) inside a single GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_end_after_start" CHECK ("end_at" > "start_at");

-- One doctor cannot be double-booked for overlapping time ranges. Scoped to
-- status='upcoming' so a cancelled/rescheduled appointment never blocks reuse
-- of its old slot (docs/api.md APT-3, section 41 "Appointment booking").
ALTER TABLE "appointments" ADD CONSTRAINT "excl_appointment_doctor_slot"
  EXCLUDE USING gist (
    "doctor_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'upcoming');

-- One patient cannot hold two overlapping live appointments (docs/api.md
-- section 41 "Appointment booking (same patient)").
ALTER TABLE "appointments" ADD CONSTRAINT "excl_appointment_patient_slot"
  EXCLUDE USING gist (
    "patient_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'upcoming');

-- Exactly one active check-in token per appointment — issuing a new token
-- must replace (not duplicate) the prior active one (docs/api.md APT-7).
CREATE UNIQUE INDEX "uniq_check_in_token_active_per_appointment"
  ON "appointment_check_in_tokens" ("appointment_id")
  WHERE ("status" = 'active');

-- At most one live (non-terminal) queue ticket per appointment — the
-- database-level backstop behind the QR check-in idempotent-replay logic
-- (docs/api.md section 41 "QR check-in"), so even a bug in the application's
-- idempotency check can never produce two tickets for one appointment.
CREATE UNIQUE INDEX "uniq_queue_ticket_live_per_appointment"
  ON "queue_tickets" ("appointment_id")
  WHERE ("status" IN ('waiting', 'called', 'acknowledged', 'in_service'));
