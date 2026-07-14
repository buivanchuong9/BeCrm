-- CreateEnum
CREATE TYPE "PatientGender" AS ENUM ('male', 'female', 'other', 'unknown');

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" "PatientGender" NOT NULL DEFAULT 'unknown',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "blood_type" TEXT NOT NULL DEFAULT 'unknown',
    "primary_doctor_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_care_team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "relationship" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_care_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMPTZ,
    "withdrawn_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consent_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "patients_organization_id_idx" ON "patients"("organization_id");

-- CreateIndex
CREATE INDEX "patients_primary_doctor_id_idx" ON "patients"("primary_doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_organization_id_code_key" ON "patients"("organization_id", "code");

-- CreateIndex
CREATE INDEX "patient_care_team_patient_id_idx" ON "patient_care_team"("patient_id");

-- CreateIndex
CREATE INDEX "patient_care_team_user_id_idx" ON "patient_care_team"("user_id");

-- CreateIndex
CREATE INDEX "consents_patient_id_idx" ON "consents"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "consents_patient_id_type_key" ON "consents"("patient_id", "type");

-- CreateIndex
CREATE INDEX "consent_events_patient_id_occurred_at_idx" ON "consent_events"("patient_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_primary_doctor_id_fkey" FOREIGN KEY ("primary_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Handwritten additions (T04): CHECK constraints Prisma's declarative schema
-- cannot express, plus append-only enforcement for consent_events.

-- blood_type is a checked free-text column (not a Prisma enum) so the API's
-- literal 'A+'/'O-'/... values are stored/returned verbatim with no
-- enum-identifier translation layer (see schema.prisma comment on Patient.bloodType).
ALTER TABLE "patients" ADD CONSTRAINT "patients_blood_type_check"
  CHECK ("blood_type" IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'));

-- Known consent-type catalog confirmed from the frontend (SettingsPage.tsx
-- CONSENT_LABEL / seed.ts): data_processing, research_data_sharing,
-- telemedicine. Extending this list is a reviewed migration, not a runtime
-- config value, since consent types are a legal/compliance surface.
ALTER TABLE "consents" ADD CONSTRAINT "consents_type_check"
  CHECK ("type" IN ('data_processing', 'research_data_sharing', 'telemedicine'));
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_type_check"
  CHECK ("type" IN ('data_processing', 'research_data_sharing', 'telemedicine'));
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_action_check"
  CHECK ("action" IN ('granted', 'withdrawn'));

-- patient_care_team "interval check" per spec section 21: an end date, when
-- present, must be strictly after the start date.
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_interval_check"
  CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at");

-- consent_events is append-only, same pattern as audit_events (migration
-- 20260714082505_audit_immutability). A separate, generic function is used
-- here (rather than reusing prevent_audit_mutation(), which hardcodes
-- "audit_events" in its error message) so the violation message names the
-- actual offending table.
CREATE OR REPLACE FUNCTION prevent_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_events_no_update
  BEFORE UPDATE ON consent_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER consent_events_no_delete
  BEFORE DELETE ON consent_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
