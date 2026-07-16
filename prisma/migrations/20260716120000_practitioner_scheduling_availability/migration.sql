CREATE TYPE "PractitionerStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "ScheduleExceptionKind" AS ENUM ('unavailable', 'override');

CREATE TABLE "practitioner_profiles" (
  "user_id" UUID NOT NULL,
  "license_number" TEXT NOT NULL,
  "title" TEXT,
  "bio" TEXT,
  "status" "PractitionerStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "practitioner_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "practitioner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "practitioner_profiles_license_number_key" ON "practitioner_profiles"("license_number");

CREATE TABLE "specialties" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "specialties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "specialties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "specialties_organization_id_code_key" UNIQUE ("organization_id", "code")
);
CREATE INDEX "specialties_organization_id_active_idx" ON "specialties"("organization_id", "active");

CREATE TABLE "practitioner_specialties" (
  "practitioner_user_id" UUID NOT NULL,
  "specialty_id" UUID NOT NULL,
  "primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "practitioner_specialties_pkey" PRIMARY KEY ("practitioner_user_id", "specialty_id"),
  CONSTRAINT "practitioner_specialties_practitioner_user_id_fkey" FOREIGN KEY ("practitioner_user_id") REFERENCES "practitioner_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "practitioner_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "practitioner_specialties_specialty_id_idx" ON "practitioner_specialties"("specialty_id");

CREATE TABLE "practitioner_clinic_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practitioner_user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "clinic_location_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "practitioner_clinic_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "practitioner_clinic_assignments_practitioner_user_id_fkey" FOREIGN KEY ("practitioner_user_id") REFERENCES "practitioner_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "practitioner_clinic_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "practitioner_clinic_assignments_clinic_location_id_fkey" FOREIGN KEY ("clinic_location_id") REFERENCES "clinic_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "practitioner_clinic_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "practitioner_assignment_duration_check" CHECK ("slot_duration_minutes" BETWEEN 5 AND 240),
  CONSTRAINT "practitioner_assignment_capacity_check" CHECK ("capacity" BETWEEN 1 AND 100),
  CONSTRAINT "practitioner_assignment_unique" UNIQUE ("practitioner_user_id", "clinic_location_id", "department_id")
);
CREATE INDEX "practitioner_clinic_assignments_scope_idx" ON "practitioner_clinic_assignments"("organization_id", "clinic_location_id", "active");

CREATE TABLE "practitioner_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_minute" INTEGER NOT NULL,
  "end_minute" INTEGER NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "practitioner_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "practitioner_schedules_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "practitioner_clinic_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "practitioner_schedule_day_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
  CONSTRAINT "practitioner_schedule_minute_check" CHECK ("start_minute" >= 0 AND "end_minute" <= 1440 AND "end_minute" > "start_minute"),
  CONSTRAINT "practitioner_schedule_effective_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
CREATE INDEX "practitioner_schedules_assignment_day_idx" ON "practitioner_schedules"("assignment_id", "day_of_week", "active");

CREATE TABLE "practitioner_schedule_exceptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "kind" "ScheduleExceptionKind" NOT NULL DEFAULT 'unavailable',
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "practitioner_schedule_exceptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "practitioner_schedule_exceptions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "practitioner_clinic_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "practitioner_schedule_exception_range_check" CHECK ("ends_at" > "starts_at")
);
CREATE INDEX "practitioner_schedule_exceptions_range_idx" ON "practitioner_schedule_exceptions"("assignment_id", "starts_at", "ends_at");

CREATE TABLE "appointment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointment_id" UUID NOT NULL,
  "actor_id" UUID,
  "action" TEXT NOT NULL,
  "from_status" "AppointmentStatus",
  "to_status" "AppointmentStatus" NOT NULL,
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "reason" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "appointment_history_appointment_id_occurred_at_idx" ON "appointment_history"("appointment_id", "occurred_at");

CREATE OR REPLACE FUNCTION prevent_appointment_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'appointment_history is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER appointment_history_no_update BEFORE UPDATE ON "appointment_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_appointment_history_mutation();
CREATE TRIGGER appointment_history_no_delete BEFORE DELETE ON "appointment_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_appointment_history_mutation();
