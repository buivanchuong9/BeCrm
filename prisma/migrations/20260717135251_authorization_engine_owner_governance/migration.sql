-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "DangerousActionType" AS ENUM ('add_owner', 'revoke_all_sessions', 'bulk_directory_export', 'bulk_membership_revoke', 'disable_audit');

-- CreateEnum
CREATE TYPE "DangerousActionStatus" AS ENUM ('pending', 'approved', 'rejected', 'executed', 'expired');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "BreakGlassStatus" AS ENUM ('active', 'ended', 'expired');

-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dangerous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "UserRole" NOT NULL,
    "permission_code" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permission_code")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_key" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organization_id" UUID NOT NULL,
    "clinic_location_id" UUID,
    "department_id" UUID,
    "invited_by" UUID NOT NULL,
    "user_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dangerous_action_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "DangerousActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_by" UUID NOT NULL,
    "status" "DangerousActionStatus" NOT NULL DEFAULT 'pending',
    "required_approvals" INTEGER NOT NULL DEFAULT 2,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "executed_at" TIMESTAMPTZ,
    "execution_result" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dangerous_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dangerous_action_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dangerous_action_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_glass_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grantee_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BreakGlassStatus" NOT NULL DEFAULT 'active',
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "break_glass_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_security_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "audit_suspended_until" TIMESTAMPTZ,
    "audit_suspended_by" UUID,
    "audit_suspended_reason" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_security_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_feature_key_organization_id_key" ON "feature_flag_overrides"("feature_key", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_hash_key" ON "staff_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "staff_invitations_email_status_idx" ON "staff_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "dangerous_action_requests_status_expires_at_idx" ON "dangerous_action_requests"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "dangerous_action_approvals_request_id_approver_id_key" ON "dangerous_action_approvals"("request_id", "approver_id");

-- CreateIndex
CREATE INDEX "break_glass_grants_grantee_id_patient_id_status_idx" ON "break_glass_grants"("grantee_id", "patient_id", "status");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_feature_key_fkey" FOREIGN KEY ("feature_key") REFERENCES "feature_flags"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dangerous_action_approvals" ADD CONSTRAINT "dangerous_action_approvals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "dangerous_action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "account_deletion_requests_user_status_idx" RENAME TO "account_deletion_requests_user_id_status_idx";

-- RenameIndex
ALTER INDEX "follow_up_activities_plan_status_due_idx" RENAME TO "follow_up_activities_care_plan_id_status_due_date_idx";

-- RenameIndex
ALTER INDEX "integration_messages_connection_created_idx" RENAME TO "integration_messages_connection_id_created_at_idx";

-- RenameIndex
ALTER INDEX "medication_reminders_patient_active_idx" RENAME TO "medication_reminders_patient_id_active_idx";

-- RenameIndex
ALTER INDEX "notifications_recipient_read_created_idx" RENAME TO "notifications_recipient_id_read_created_at_idx";

-- RenameIndex
ALTER INDEX "password_reset_tokens_user_expires_idx" RENAME TO "password_reset_tokens_user_id_expires_at_idx";

-- RenameIndex
ALTER INDEX "practitioner_assignment_unique" RENAME TO "practitioner_clinic_assignments_practitioner_user_id_clinic_key";

-- RenameIndex
ALTER INDEX "practitioner_clinic_assignments_scope_idx" RENAME TO "practitioner_clinic_assignments_organization_id_clinic_loca_idx";

-- RenameIndex
ALTER INDEX "practitioner_schedule_exceptions_range_idx" RENAME TO "practitioner_schedule_exceptions_assignment_id_starts_at_en_idx";

-- RenameIndex
ALTER INDEX "practitioner_schedules_assignment_day_idx" RENAME TO "practitioner_schedules_assignment_id_day_of_week_active_idx";

-- RenameIndex
ALTER INDEX "prescription_refill_requests_patient_requested_idx" RENAME TO "prescription_refill_requests_patient_id_requested_at_idx";

-- RenameIndex
ALTER INDEX "progress_photos_patient_taken_idx" RENAME TO "progress_photos_patient_id_taken_at_idx";

-- RenameIndex
ALTER INDEX "support_tickets_user_created_idx" RENAME TO "support_tickets_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "upload_objects_owner_status_idx" RENAME TO "upload_objects_owner_id_status_idx";
