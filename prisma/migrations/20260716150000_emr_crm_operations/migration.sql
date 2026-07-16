CREATE TABLE "medical_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "encounter_id" UUID NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'draft', "diagnosis_id" UUID, "prescription_id" UUID,
  "discharge" JSONB, "follow_up" JSONB, "signed_by" UUID, "signed_at" TIMESTAMPTZ,
  "reopened_reason" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "medical_record_status_check" CHECK ("status" IN ('draft','in_review','awaiting_completion','awaiting_signature','signed','addendum_required','amended','reopened'))
);
CREATE INDEX "medical_records_status_idx" ON "medical_records"("status");

CREATE TABLE "medical_record_addenda" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "record_id" UUID NOT NULL, "text" TEXT NOT NULL,
  "added_by" UUID NOT NULL, "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "medical_record_addenda_record_id_added_at_idx" ON "medical_record_addenda"("record_id","added_at");

CREATE TABLE "prescriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "encounter_id" UUID NOT NULL,
  "doctor_id" UUID NOT NULL, "medications" JSONB NOT NULL,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "prescriptions_encounter_id_issued_at_idx" ON "prescriptions"("encounter_id","issued_at");

CREATE TABLE "clinical_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "encounter_id" UUID NOT NULL,
  "workflow_task_id" UUID, "clinical_order_id" UUID, "type" TEXT NOT NULL,
  "file_id" UUID NOT NULL, "file_name" TEXT NOT NULL, "file_hash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "uploaded_by" UUID NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_status" TEXT NOT NULL DEFAULT 'pending', "signature_status" TEXT NOT NULL DEFAULT 'unsigned',
  "incorrect_link_flag" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "clinical_document_review_check" CHECK ("review_status" IN ('pending','reviewed')),
  CONSTRAINT "clinical_document_signature_check" CHECK ("signature_status" IN ('unsigned','signed'))
);
CREATE INDEX "clinical_documents_encounter_id_idx" ON "clinical_documents"("encounter_id");

CREATE TABLE "crm_care_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "patient_id" UUID NOT NULL, "encounter_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_started', "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL, UNIQUE("patient_id","encounter_id"),
  CONSTRAINT "crm_care_plan_status_check" CHECK ("status" IN ('not_started','active','completed','suspended'))
);
CREATE INDEX "crm_care_plans_patient_id_idx" ON "crm_care_plans"("patient_id");

CREATE TABLE "follow_up_activities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "care_plan_id" UUID NOT NULL, "type" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "due_date" TIMESTAMPTZ NOT NULL,
  "priority" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'scheduled', "automation_mode" TEXT,
  "automation_action" TEXT, "last_automated_at" TIMESTAMPTZ, "automation_run_count" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follow_up_status_check" CHECK ("status" IN ('scheduled','due','completed','escalated','cancelled'))
);
CREATE INDEX "follow_up_activities_plan_status_due_idx" ON "follow_up_activities"("care_plan_id","status","due_date");

CREATE TABLE "clinical_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "care_plan_id" UUID, "patient_id" UUID NOT NULL,
  "encounter_id" UUID, "trigger" TEXT NOT NULL, "severity" TEXT NOT NULL,
  "responsible_actor" TEXT NOT NULL, "response_deadline_hours" INTEGER NOT NULL,
  "requires_linked_encounter" BOOLEAN NOT NULL, "status" TEXT NOT NULL DEFAULT 'open',
  "note" TEXT NOT NULL, "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_by" UUID, "closed_at" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "clinical_alert_status_check" CHECK ("status" IN ('open','acknowledged','encounter_requested','resolved'))
);
CREATE INDEX "clinical_alerts_patient_id_status_idx" ON "clinical_alerts"("patient_id","status");

CREATE TABLE "encounter_creation_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "patient_id" UUID NOT NULL, "source_alert_id" UUID,
  "requested_by_role" TEXT NOT NULL, "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'requested',
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "decided_by" UUID, "decided_at" TIMESTAMPTZ,
  "created_encounter_id" UUID, "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "encounter_request_status_check" CHECK ("status" IN ('requested','approved','rejected','encounter_created'))
);
CREATE INDEX "encounter_creation_requests_status_requested_at_idx" ON "encounter_creation_requests"("status","requested_at");

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "event" TEXT NOT NULL, "recipient_id" UUID NOT NULL,
  "recipient_role" TEXT NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'queued',
  "message" TEXT NOT NULL, "related_patient_id" UUID, "related_encounter_id" UUID,
  "related_workflow_task_id" UUID, "delivered_at" TIMESTAMPTZ, "failure_reason" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0, "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_channel_check" CHECK ("channel" IN ('in_app','sms','email','push')),
  CONSTRAINT "notification_status_check" CHECK ("status" IN ('queued','sent','delivered','failed','retrying'))
);
CREATE INDEX "notifications_recipient_read_created_idx" ON "notifications"("recipient_id","read","created_at");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

CREATE TABLE "integration_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "name" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'healthy', "last_success_at" TIMESTAMPTZ, "last_failure_at" TIMESTAMPTZ,
  "pending_messages" INTEGER NOT NULL DEFAULT 0, "retry_count" INTEGER NOT NULL DEFAULT 0,
  "dead_letter_count" INTEGER NOT NULL DEFAULT 0, "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "integration_status_check" CHECK ("status" IN ('healthy','degraded','down'))
);
CREATE TABLE "integration_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "connection_id" UUID NOT NULL,
  "correlation_id" TEXT NOT NULL, "idempotency_key" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
  "payload" JSONB, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("connection_id","idempotency_key"),
  CONSTRAINT "integration_message_status_check" CHECK ("status" IN ('pending','delivered','failed','duplicate_rejected'))
);
CREATE INDEX "integration_messages_connection_created_idx" ON "integration_messages"("connection_id","created_at");

CREATE TABLE "upload_objects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "owner_id" UUID NOT NULL, "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL, "context" TEXT NOT NULL, "storage_key" TEXT NOT NULL UNIQUE,
  "file_hash" TEXT, "status" TEXT NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMPTZ NOT NULL,
  "confirmed_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "upload_status_check" CHECK ("status" IN ('pending','confirmed','expired'))
);
CREATE INDEX "upload_objects_owner_status_idx" ON "upload_objects"("owner_id","status");

CREATE TABLE "support_tickets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "topic" TEXT NOT NULL,
  "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "support_tickets_user_created_idx" ON "support_tickets"("user_id","created_at");

CREATE TABLE "medication_reminders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "patient_id" UUID NOT NULL, "prescription_id" UUID,
  "medication_name" TEXT NOT NULL, "schedule" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "taken_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "medication_reminders_patient_active_idx" ON "medication_reminders"("patient_id","active");

CREATE TABLE "prescription_refill_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "prescription_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL, "requested_by" UUID NOT NULL, "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested', "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prescription_refill_status_check" CHECK ("status" IN ('requested','approved','rejected','fulfilled'))
);
CREATE INDEX "prescription_refill_requests_patient_requested_idx" ON "prescription_refill_requests"("patient_id","requested_at");

CREATE TABLE "progress_photos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "patient_id" UUID NOT NULL, "file_id" UUID NOT NULL,
  "taken_at" TIMESTAMPTZ NOT NULL, "ai_score" DOUBLE PRECISION, "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "progress_photos_patient_taken_idx" ON "progress_photos"("patient_id","taken_at");

CREATE TABLE "account_deletion_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested', "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMPTZ
);
CREATE INDEX "account_deletion_requests_user_status_idx" ON "account_deletion_requests"("user_id","status");

CREATE TABLE "password_reset_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_reset_tokens_user_expires_idx" ON "password_reset_tokens"("user_id","expires_at");

CREATE OR REPLACE FUNCTION prevent_emr_append_only_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP USING ERRCODE='insufficient_privilege'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER medical_record_addenda_no_update BEFORE UPDATE ON "medical_record_addenda" FOR EACH ROW EXECUTE FUNCTION prevent_emr_append_only_mutation();
CREATE TRIGGER medical_record_addenda_no_delete BEFORE DELETE ON "medical_record_addenda" FOR EACH ROW EXECUTE FUNCTION prevent_emr_append_only_mutation();
