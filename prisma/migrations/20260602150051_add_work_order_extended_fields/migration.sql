-- AlterTable
ALTER TABLE "bpm"."bpm_process_instances" ADD COLUMN     "business_key" VARCHAR(100);

-- AlterTable
ALTER TABLE "bpm"."bpm_process_templates" ADD COLUMN     "xml_data" TEXT,
ADD COLUMN     "xml_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bpm"."bpm_task_tokens" ADD COLUMN     "candidate_groups" JSONB,
ADD COLUMN     "delegate_reason" TEXT,
ADD COLUMN     "delegated_from" UUID,
ADD COLUMN     "form_data" JSONB,
ADD COLUMN     "sla_due_date" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "bpm"."bpm_work_orders" ADD COLUMN     "content_delta" JSONB,
ADD COLUMN     "customers" JSONB,
ADD COLUMN     "manager_id" UUID,
ADD COLUMN     "participants" JSONB,
ADD COLUMN     "paused_at" TIMESTAMPTZ,
ADD COLUMN     "percent_done" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_content" TEXT,
ADD COLUMN     "rating_mark" INTEGER,
ADD COLUMN     "start_time" TIMESTAMPTZ,
ADD COLUMN     "work_load" DOUBLE PRECISION,
ADD COLUMN     "work_load_unit" VARCHAR(20);

-- CreateTable
CREATE TABLE "iam"."customer_schedulers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "iam_employee_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_schedulers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "exchange_type" VARCHAR(30) NOT NULL DEFAULT 'note',
    "content" TEXT,
    "content_delta" JSONB,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "customer_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_viewers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "customer_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "related_id" UUID NOT NULL,
    "relationship_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customer_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."telesale_calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "iam_employee_id" UUID NOT NULL,
    "call_type" VARCHAR(20) NOT NULL DEFAULT 'outbound',
    "duration" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
    "note" TEXT,
    "recording_url" VARCHAR(500),
    "called_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "telesale_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "field_type" VARCHAR(30) NOT NULL DEFAULT 'text',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "customer_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."bought_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "card_id" UUID,
    "card_number" VARCHAR(100),
    "issued_at" TIMESTAMPTZ,
    "expired_at" TIMESTAMPTZ,
    "points" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bought_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."bought_card_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "bought_card_id" UUID,
    "service_name" VARCHAR(500) NOT NULL,
    "service_code" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "used_quantity" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(18,2),
    "expired_at" TIMESTAMPTZ,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bought_card_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."bought_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_name" VARCHAR(500) NOT NULL,
    "product_code" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(18,2),
    "total_amount" DECIMAL(18,2),
    "purchased_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_code" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bought_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."bought_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "service_name" VARCHAR(500) NOT NULL,
    "service_code" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(18,2),
    "total_amount" DECIMAL(18,2),
    "purchased_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_code" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bought_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."loyalty_point_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "trans_type" VARCHAR(20) NOT NULL DEFAULT 'earn',
    "points" INTEGER NOT NULL DEFAULT 0,
    "balance_after" INTEGER NOT NULL DEFAULT 0,
    "ref_type" VARCHAR(50),
    "ref_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "loyalty_point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "area_type" VARCHAR(30) NOT NULL DEFAULT 'province',
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "project_type_id" UUID,
    "iam_manager_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "start_date" DATE,
    "end_date" DATE,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_project_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_project_id" UUID NOT NULL,
    "iam_employee_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "work_project_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_project_id" UUID,
    "work_type_id" UUID,
    "code" VARCHAR(50),
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "iam_assignee_id" UUID,
    "iam_manager_id" UUID,
    "customer_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "priority_level" VARCHAR(30),
    "due_date" TIMESTAMPTZ,
    "start_date" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "paused_at" TIMESTAMPTZ,
    "rating" INTEGER,
    "rating_note" TEXT,
    "tags" JSONB,
    "attachments" JSONB,
    "note" TEXT,
    "bpm_instance_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_order_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "related_id" UUID NOT NULL,
    "rel_type" VARCHAR(30) NOT NULL DEFAULT 'related',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "work_order_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "work_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "work_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_inprogress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "iam_actor_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_inprogress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."work_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."project_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "iam_leader_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."group_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "iam_employee_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "group_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."beauty_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(30),
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "beauty_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."beauty_salons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(30),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "beauty_salons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."artifacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "value" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."brand_names" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "brand_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."brand_name_whitelists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_name_id" UUID NOT NULL,
    "contact_phone" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "brand_name_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "description" TEXT,
    "schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bpm_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_form_artifacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bpm_form_id" UUID NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "field_label" VARCHAR(255) NOT NULL,
    "field_type" VARCHAR(30) NOT NULL DEFAULT 'text',
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "eform_config" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_form_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_form_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bpm_form_id" UUID NOT NULL,
    "source_field" VARCHAR(255) NOT NULL,
    "target_field" VARCHAR(255) NOT NULL,
    "target_model" VARCHAR(100),
    "map_type" VARCHAR(30) NOT NULL DEFAULT 'direct',
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_form_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_form_processes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bpm_form_id" UUID NOT NULL,
    "template_id" UUID,
    "node_key" VARCHAR(100),
    "trigger_event" VARCHAR(100),
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_form_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "node_key" VARCHAR(100),
    "participant_type" VARCHAR(30) NOT NULL DEFAULT 'user',
    "iam_user_id" UUID,
    "iam_role_id" UUID,
    "iam_dept_id" UUID,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_grid_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "form_id" UUID,
    "task_token_id" UUID,
    "process_instance_id" UUID,
    "grid_key" VARCHAR(100) NOT NULL,
    "schema" JSONB,
    "rows" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "bpm_grid_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_sla_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "node_key" VARCHAR(100) NOT NULL,
    "sla_type" VARCHAR(10) NOT NULL DEFAULT 'SLA',
    "duration" INTEGER NOT NULL,
    "duration_unit" VARCHAR(20) NOT NULL DEFAULT 'hours',
    "escalation_action" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_sla_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."eform_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "eform_code" VARCHAR(100) NOT NULL,
    "eform_name" VARCHAR(255) NOT NULL,
    "source_field" VARCHAR(255) NOT NULL,
    "target_field" VARCHAR(255) NOT NULL,
    "target_model" VARCHAR(100),
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "eform_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approved_object_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "object_type" VARCHAR(100) NOT NULL,
    "object_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "from_status" VARCHAR(50),
    "to_status" VARCHAR(50),
    "iam_actor_id" UUID NOT NULL,
    "note" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approved_object_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "object_type" VARCHAR(100),
    "status" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "alert_config" JSONB,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approval_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(255) NOT NULL,
    "approver_type" VARCHAR(30) NOT NULL DEFAULT 'user',
    "approver_id" UUID,
    "is_parallel" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "approval_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approval_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "object_type" VARCHAR(100) NOT NULL,
    "condition" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "approval_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approval_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "object_type" VARCHAR(100) NOT NULL,
    "object_id" UUID NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "approval_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."approval_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "approval_object_id" UUID,
    "step_no" INTEGER NOT NULL DEFAULT 1,
    "iam_actor_id" UUID NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "comment" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_pipelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "color_hex" VARCHAR(30),
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100),
    "title" VARCHAR(500) NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "pipeline_id" UUID,
    "stage_id" UUID,
    "iam_owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "contract_date" DATE,
    "expiry_date" DATE,
    "total_value" DECIMAL(18,2),
    "currency" VARCHAR(10),
    "description" TEXT,
    "note" TEXT,
    "tags" JSONB,
    "attachments" JSONB,
    "extra_fields" JSONB,
    "bpm_instance_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "act_type" VARCHAR(30) NOT NULL DEFAULT 'note',
    "content" TEXT,
    "data" JSONB,
    "iam_actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contract_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_appendices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "code" VARCHAR(100),
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "signed_date" DATE,
    "total_value" DECIMAL(18,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_appendices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payment_date" DATE,
    "due_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."saleflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "iam_owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "total_value" DECIMAL(18,2),
    "closed_at" TIMESTAMPTZ,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "saleflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."saleflow_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "saleflow_id" UUID NOT NULL,
    "act_type" VARCHAR(30) NOT NULL DEFAULT 'note',
    "content" TEXT,
    "data" JSONB,
    "iam_actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "saleflow_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."saleflow_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "saleflow_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "saleflow_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."schedule_commons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "schedule_type" VARCHAR(30) NOT NULL DEFAULT 'common',
    "customer_id" UUID,
    "contact_id" UUID,
    "iam_employee_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "note" TEXT,
    "remind_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "schedule_commons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."schedule_consultants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "iam_consultant_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "room_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "schedule_consultants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."treatment_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "treatment_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."treatment_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "room_id" UUID,
    "iam_doctor_id" UUID,
    "treatment_date" TIMESTAMPTZ NOT NULL,
    "service_name" VARCHAR(500),
    "diagnosis" TEXT,
    "prescription" TEXT,
    "note" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "treatment_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."kpi_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "kpi_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."kpi_template_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "metric_key" VARCHAR(100) NOT NULL,
    "target_value" DECIMAL(18,4),
    "unit" VARCHAR(30),
    "weight" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "kpi_template_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."kpi_setups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "iam_employee_id" UUID,
    "period" VARCHAR(20) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "total_score" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "kpi_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."kpi_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "kpi_setup_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "metric_key" VARCHAR(100) NOT NULL,
    "target_value" DECIMAL(18,4),
    "actual_value" DECIMAL(18,4),
    "unit" VARCHAR(30),
    "weight" DECIMAL(5,2),
    "score" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "kpi_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."cxm_surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "cxm_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."cxm_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "question_type" VARCHAR(30) NOT NULL DEFAULT 'single',
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "cxm_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."cxm_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "score" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "cxm_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."careers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "level" INTEGER NOT NULL DEFAULT 0,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."competencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."buildings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."building_floors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "floor_no" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "building_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."code_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_name" VARCHAR(100) NOT NULL,
    "prefix" VARCHAR(20),
    "suffix" VARCHAR(20),
    "current_no" INTEGER NOT NULL DEFAULT 0,
    "pad_length" INTEGER NOT NULL DEFAULT 5,
    "reset_period" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."banks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "short_name" VARCHAR(50),
    "logo_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "type" VARCHAR(50),
    "parent_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."category_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "value" VARCHAR(500),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "category_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "card_type" VARCHAR(30) NOT NULL DEFAULT 'loyalty',
    "point_multiplier" DECIMAL(5,2),
    "discount_pct" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."card_service_defs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "sessions" INTEGER,
    "valid_days" INTEGER,
    "price" DECIMAL(18,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "card_service_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "code" VARCHAR(100),
    "sku" VARCHAR(100),
    "category_id" UUID,
    "unit_id" UUID,
    "price" DECIMAL(18,2),
    "cost_price" DECIMAL(18,2),
    "description" TEXT,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."service_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "code" VARCHAR(100),
    "category_id" UUID,
    "price" DECIMAL(18,2),
    "duration" INTEGER,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."cashbooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "trans_type" VARCHAR(20) NOT NULL DEFAULT 'income',
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "customer_id" UUID,
    "ref_type" VARCHAR(50),
    "ref_id" UUID,
    "trans_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iam_actor_id" UUID NOT NULL,
    "category_id" UUID,
    "note" TEXT,
    "attachments" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "cashbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."filter_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "filter_data" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "filter_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ref_type" VARCHAR(50) NOT NULL,
    "ref_id" UUID NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_url" VARCHAR(1000) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "iam_author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."tip_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "tip_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."tip_group_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tip_group_id" UUID NOT NULL,
    "iam_employee_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tip_group_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."tip_group_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tip_group_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "tip_group_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."tip_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "tip_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."template_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "template_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."template_sms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "content" TEXT NOT NULL,
    "brand_name_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "template_sms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."template_zalos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "template_id" VARCHAR(100),
    "content" TEXT,
    "params" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "zalo_oa_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "template_zalos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."email_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "from_email" VARCHAR(255) NOT NULL,
    "from_name" VARCHAR(255),
    "username" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "iam_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "event_types" JSONB NOT NULL,
    "headers" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."call_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "api_url" VARCHAR(500),
    "api_key" VARCHAR(500),
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "call_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."call_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "iam_actor_id" UUID NOT NULL,
    "call_type" VARCHAR(20) NOT NULL DEFAULT 'outbound',
    "from_number" VARCHAR(30),
    "to_number" VARCHAR(30),
    "duration" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
    "recording_url" VARCHAR(500),
    "call_id" VARCHAR(100),
    "note" TEXT,
    "called_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "call_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."decision_tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "decision_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."decision_table_inputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "decision_table_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "operator" VARCHAR(20) NOT NULL DEFAULT 'eq',
    "value" TEXT,
    "data_type" VARCHAR(30) NOT NULL DEFAULT 'string',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "decision_table_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."decision_table_outputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "decision_table_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "data_type" VARCHAR(30) NOT NULL DEFAULT 'string',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "decision_table_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."business_partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(500) NOT NULL,
    "tax_code" VARCHAR(50),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "address" TEXT,
    "website" VARCHAR(500),
    "avatar_url" VARCHAR(500),
    "category_id" UUID,
    "customer_source_id" UUID,
    "iam_employee_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "extra_fields" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "business_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."business_partner_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "business_partner_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "business_partner_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "customer_id" UUID,
    "business_partner_id" UUID,
    "contract_id" UUID,
    "saleflow_id" UUID,
    "iam_owner_id" UUID,
    "invoice_date" DATE,
    "due_date" DATE,
    "total_amount" DECIMAL(18,2),
    "paid_amount" DECIMAL(18,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."invoice_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "item_name" VARCHAR(500) NOT NULL,
    "item_code" VARCHAR(100),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(5,2),
    "total_amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contract_warranties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "contract_id" UUID,
    "customer_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "start_date" DATE,
    "end_date" DATE,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contract_warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."guarantee_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "guarantee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."guarantees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "guarantee_type_id" UUID,
    "contract_id" UUID,
    "customer_id" UUID,
    "name" VARCHAR(500) NOT NULL,
    "value" DECIMAL(18,2),
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."zalo_oas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "oa_id" VARCHAR(100) NOT NULL,
    "oa_name" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "zalo_oas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."treatment_times" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "room_id" UUID,
    "iam_doctor_id" UUID,
    "day_of_week" INTEGER,
    "start_time" VARCHAR(8),
    "end_time" VARCHAR(8),
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "treatment_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."object_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "object_type" VARCHAR(100) NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "field_label" VARCHAR(255) NOT NULL,
    "field_type" VARCHAR(30) NOT NULL DEFAULT 'text',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "object_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "report_type" VARCHAR(50) NOT NULL,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_schedulers_tenant_id_customer_id_idx" ON "iam"."customer_schedulers"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_exchanges_tenant_id_customer_id_idx" ON "iam"."customer_exchanges"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_viewers_customer_id_iam_user_id_key" ON "iam"."customer_viewers"("customer_id", "iam_user_id");

-- CreateIndex
CREATE INDEX "customer_relationships_tenant_id_customer_id_idx" ON "iam"."customer_relationships"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "telesale_calls_tenant_id_customer_id_idx" ON "iam"."telesale_calls"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_fields_tenant_id_field_key_key" ON "iam"."customer_fields"("tenant_id", "field_key");

-- CreateIndex
CREATE INDEX "bought_cards_tenant_id_customer_id_idx" ON "iam"."bought_cards"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "bought_card_services_tenant_id_customer_id_idx" ON "iam"."bought_card_services"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "bought_products_tenant_id_customer_id_idx" ON "iam"."bought_products"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "bought_services_tenant_id_customer_id_idx" ON "iam"."bought_services"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "loyalty_point_ledger_tenant_id_customer_id_idx" ON "iam"."loyalty_point_ledger"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "work_projects_tenant_id_idx" ON "iam"."work_projects"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_project_employees_work_project_id_iam_employee_id_key" ON "iam"."work_project_employees"("work_project_id", "iam_employee_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "iam"."work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_iam_assignee_id_idx" ON "iam"."work_orders"("tenant_id", "iam_assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_relations_work_order_id_related_id_key" ON "iam"."work_order_relations"("work_order_id", "related_id");

-- CreateIndex
CREATE INDEX "work_exchanges_work_order_id_idx" ON "iam"."work_exchanges"("work_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_participants_work_order_id_iam_user_id_key" ON "iam"."work_participants"("work_order_id", "iam_user_id");

-- CreateIndex
CREATE INDEX "work_inprogress_work_order_id_idx" ON "iam"."work_inprogress"("work_order_id");

-- CreateIndex
CREATE INDEX "groups_tenant_id_idx" ON "iam"."groups"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_employees_group_id_iam_employee_id_key" ON "iam"."group_employees"("group_id", "iam_employee_id");

-- CreateIndex
CREATE INDEX "beauty_branches_tenant_id_idx" ON "iam"."beauty_branches"("tenant_id");

-- CreateIndex
CREATE INDEX "beauty_salons_tenant_id_idx" ON "iam"."beauty_salons"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_tenant_id_code_key" ON "iam"."artifacts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "brand_name_whitelists_tenant_id_brand_name_id_idx" ON "iam"."brand_name_whitelists"("tenant_id", "brand_name_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_forms_tenant_id_code_key" ON "bpm"."bpm_forms"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "bpm_form_artifacts_bpm_form_id_idx" ON "bpm"."bpm_form_artifacts"("bpm_form_id");

-- CreateIndex
CREATE INDEX "bpm_form_mappings_bpm_form_id_idx" ON "bpm"."bpm_form_mappings"("bpm_form_id");

-- CreateIndex
CREATE INDEX "bpm_form_processes_bpm_form_id_idx" ON "bpm"."bpm_form_processes"("bpm_form_id");

-- CreateIndex
CREATE INDEX "bpm_participants_tenant_id_template_id_idx" ON "bpm"."bpm_participants"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "bpm_grid_data_tenant_id_grid_key_idx" ON "bpm"."bpm_grid_data"("tenant_id", "grid_key");

-- CreateIndex
CREATE INDEX "bpm_grid_data_process_instance_id_idx" ON "bpm"."bpm_grid_data"("process_instance_id");

-- CreateIndex
CREATE INDEX "bpm_grid_data_task_token_id_idx" ON "bpm"."bpm_grid_data"("task_token_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_sla_configs_template_id_node_key_sla_type_key" ON "bpm"."bpm_sla_configs"("template_id", "node_key", "sla_type");

-- CreateIndex
CREATE INDEX "eform_mappings_tenant_id_idx" ON "bpm"."eform_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "approved_object_logs_tenant_id_object_type_object_id_idx" ON "bpm"."approved_object_logs"("tenant_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "approvals_tenant_id_idx" ON "bpm"."approvals"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_configs_approval_id_idx" ON "bpm"."approval_configs"("approval_id");

-- CreateIndex
CREATE INDEX "approval_links_approval_id_idx" ON "bpm"."approval_links"("approval_id");

-- CreateIndex
CREATE INDEX "approval_objects_tenant_id_object_type_object_id_idx" ON "bpm"."approval_objects"("tenant_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "approval_logs_approval_id_idx" ON "bpm"."approval_logs"("approval_id");

-- CreateIndex
CREATE INDEX "contract_pipelines_tenant_id_idx" ON "crm"."contract_pipelines"("tenant_id");

-- CreateIndex
CREATE INDEX "contract_stages_pipeline_id_idx" ON "crm"."contract_stages"("pipeline_id");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_status_idx" ON "crm"."contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_customer_id_idx" ON "crm"."contracts"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "contract_activities_contract_id_idx" ON "crm"."contract_activities"("contract_id");

-- CreateIndex
CREATE INDEX "contract_appendices_contract_id_idx" ON "crm"."contract_appendices"("contract_id");

-- CreateIndex
CREATE INDEX "contract_payments_contract_id_idx" ON "crm"."contract_payments"("contract_id");

-- CreateIndex
CREATE INDEX "contract_exchanges_contract_id_idx" ON "crm"."contract_exchanges"("contract_id");

-- CreateIndex
CREATE INDEX "saleflows_tenant_id_status_idx" ON "crm"."saleflows"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "saleflow_activities_saleflow_id_idx" ON "crm"."saleflow_activities"("saleflow_id");

-- CreateIndex
CREATE INDEX "saleflow_exchanges_saleflow_id_idx" ON "crm"."saleflow_exchanges"("saleflow_id");

-- CreateIndex
CREATE INDEX "schedule_commons_tenant_id_scheduled_at_idx" ON "crm"."schedule_commons"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "schedule_consultants_tenant_id_idx" ON "crm"."schedule_consultants"("tenant_id");

-- CreateIndex
CREATE INDEX "treatment_histories_tenant_id_customer_id_idx" ON "crm"."treatment_histories"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "kpi_templates_tenant_id_idx" ON "crm"."kpi_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "kpi_template_goals_template_id_idx" ON "crm"."kpi_template_goals"("template_id");

-- CreateIndex
CREATE INDEX "kpi_setups_tenant_id_idx" ON "crm"."kpi_setups"("tenant_id");

-- CreateIndex
CREATE INDEX "kpi_goals_kpi_setup_id_idx" ON "crm"."kpi_goals"("kpi_setup_id");

-- CreateIndex
CREATE INDEX "cxm_questions_survey_id_idx" ON "crm"."cxm_questions"("survey_id");

-- CreateIndex
CREATE INDEX "cxm_options_question_id_idx" ON "crm"."cxm_options"("question_id");

-- CreateIndex
CREATE INDEX "positions_tenant_id_idx" ON "iam"."positions"("tenant_id");

-- CreateIndex
CREATE INDEX "building_floors_building_id_idx" ON "iam"."building_floors"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "code_sequences_tenant_id_entity_name_key" ON "iam"."code_sequences"("tenant_id", "entity_name");

-- CreateIndex
CREATE INDEX "categories_tenant_id_type_idx" ON "iam"."categories"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "category_items_category_id_idx" ON "iam"."category_items"("category_id");

-- CreateIndex
CREATE INDEX "card_service_defs_card_id_idx" ON "iam"."card_service_defs"("card_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "iam"."products"("tenant_id");

-- CreateIndex
CREATE INDEX "service_items_tenant_id_idx" ON "iam"."service_items"("tenant_id");

-- CreateIndex
CREATE INDEX "cashbooks_tenant_id_trans_date_idx" ON "iam"."cashbooks"("tenant_id", "trans_date");

-- CreateIndex
CREATE INDEX "filter_settings_tenant_id_iam_user_id_entity_type_idx" ON "iam"."filter_settings"("tenant_id", "iam_user_id", "entity_type");

-- CreateIndex
CREATE INDEX "attachments_tenant_id_ref_type_ref_id_idx" ON "iam"."attachments"("tenant_id", "ref_type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "tip_group_employees_tip_group_id_iam_employee_id_key" ON "iam"."tip_group_employees"("tip_group_id", "iam_employee_id");

-- CreateIndex
CREATE INDEX "tip_users_tenant_id_iam_user_id_idx" ON "iam"."tip_users"("tenant_id", "iam_user_id");

-- CreateIndex
CREATE INDEX "call_activities_tenant_id_customer_id_idx" ON "iam"."call_activities"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "decision_tables_tenant_id_idx" ON "bpm"."decision_tables"("tenant_id");

-- CreateIndex
CREATE INDEX "decision_table_inputs_decision_table_id_idx" ON "bpm"."decision_table_inputs"("decision_table_id");

-- CreateIndex
CREATE INDEX "decision_table_outputs_decision_table_id_idx" ON "bpm"."decision_table_outputs"("decision_table_id");

-- CreateIndex
CREATE INDEX "business_partners_tenant_id_idx" ON "crm"."business_partners"("tenant_id");

-- CreateIndex
CREATE INDEX "business_partner_exchanges_business_partner_id_idx" ON "crm"."business_partner_exchanges"("business_partner_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_customer_id_idx" ON "crm"."invoices"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "invoice_details_invoice_id_idx" ON "crm"."invoice_details"("invoice_id");

-- CreateIndex
CREATE INDEX "contract_warranties_tenant_id_contract_id_idx" ON "crm"."contract_warranties"("tenant_id", "contract_id");

-- CreateIndex
CREATE INDEX "guarantees_tenant_id_contract_id_idx" ON "crm"."guarantees"("tenant_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "zalo_oas_tenant_id_oa_id_key" ON "iam"."zalo_oas"("tenant_id", "oa_id");

-- CreateIndex
CREATE INDEX "treatment_times_tenant_id_idx" ON "crm"."treatment_times"("tenant_id");

-- CreateIndex
CREATE INDEX "object_attributes_tenant_id_object_type_idx" ON "iam"."object_attributes"("tenant_id", "object_type");

-- CreateIndex
CREATE UNIQUE INDEX "object_attributes_tenant_id_object_type_field_key_key" ON "iam"."object_attributes"("tenant_id", "object_type", "field_key");

-- CreateIndex
CREATE INDEX "reports_tenant_id_idx" ON "iam"."reports"("tenant_id");

-- CreateIndex
CREATE INDEX "bpm_process_instances_tenant_id_status_idx" ON "bpm"."bpm_process_instances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "bpm_process_instances_tenant_id_business_key_idx" ON "bpm"."bpm_process_instances"("tenant_id", "business_key");

-- CreateIndex
CREATE INDEX "bpm_task_tokens_tenant_id_status_iam_assignee_id_idx" ON "bpm"."bpm_task_tokens"("tenant_id", "status", "iam_assignee_id");

-- CreateIndex
CREATE INDEX "bpm_task_tokens_sla_due_date_idx" ON "bpm"."bpm_task_tokens"("sla_due_date");

-- AddForeignKey
ALTER TABLE "iam"."bought_card_services" ADD CONSTRAINT "bought_card_services_bought_card_id_fkey" FOREIGN KEY ("bought_card_id") REFERENCES "iam"."bought_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."areas" ADD CONSTRAINT "areas_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "iam"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_project_employees" ADD CONSTRAINT "work_project_employees_work_project_id_fkey" FOREIGN KEY ("work_project_id") REFERENCES "iam"."work_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_orders" ADD CONSTRAINT "work_orders_work_project_id_fkey" FOREIGN KEY ("work_project_id") REFERENCES "iam"."work_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_orders" ADD CONSTRAINT "work_orders_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "iam"."work_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_order_relations" ADD CONSTRAINT "work_order_relations_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "iam"."work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_order_relations" ADD CONSTRAINT "work_order_relations_related_id_fkey" FOREIGN KEY ("related_id") REFERENCES "iam"."work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_exchanges" ADD CONSTRAINT "work_exchanges_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "iam"."work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_participants" ADD CONSTRAINT "work_participants_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "iam"."work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."work_inprogress" ADD CONSTRAINT "work_inprogress_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "iam"."work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."group_employees" ADD CONSTRAINT "group_employees_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "iam"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."beauty_branches" ADD CONSTRAINT "beauty_branches_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "iam"."beauty_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."brand_name_whitelists" ADD CONSTRAINT "brand_name_whitelists_brand_name_id_fkey" FOREIGN KEY ("brand_name_id") REFERENCES "iam"."brand_names"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_form_artifacts" ADD CONSTRAINT "bpm_form_artifacts_bpm_form_id_fkey" FOREIGN KEY ("bpm_form_id") REFERENCES "bpm"."bpm_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_form_mappings" ADD CONSTRAINT "bpm_form_mappings_bpm_form_id_fkey" FOREIGN KEY ("bpm_form_id") REFERENCES "bpm"."bpm_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_form_processes" ADD CONSTRAINT "bpm_form_processes_bpm_form_id_fkey" FOREIGN KEY ("bpm_form_id") REFERENCES "bpm"."bpm_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_grid_data" ADD CONSTRAINT "bpm_grid_data_process_instance_id_fkey" FOREIGN KEY ("process_instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_sla_configs" ADD CONSTRAINT "bpm_sla_configs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."approval_configs" ADD CONSTRAINT "approval_configs_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "bpm"."approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."approval_links" ADD CONSTRAINT "approval_links_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "bpm"."approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."approval_objects" ADD CONSTRAINT "approval_objects_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "bpm"."approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."approval_logs" ADD CONSTRAINT "approval_logs_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "bpm"."approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."approval_logs" ADD CONSTRAINT "approval_logs_approval_object_id_fkey" FOREIGN KEY ("approval_object_id") REFERENCES "bpm"."approval_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contract_stages" ADD CONSTRAINT "contract_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm"."contract_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contracts" ADD CONSTRAINT "contracts_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm"."contract_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contracts" ADD CONSTRAINT "contracts_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "crm"."contract_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contract_activities" ADD CONSTRAINT "contract_activities_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contract_appendices" ADD CONSTRAINT "contract_appendices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contract_payments" ADD CONSTRAINT "contract_payments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contract_exchanges" ADD CONSTRAINT "contract_exchanges_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "crm"."contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."saleflow_activities" ADD CONSTRAINT "saleflow_activities_saleflow_id_fkey" FOREIGN KEY ("saleflow_id") REFERENCES "crm"."saleflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."saleflow_exchanges" ADD CONSTRAINT "saleflow_exchanges_saleflow_id_fkey" FOREIGN KEY ("saleflow_id") REFERENCES "crm"."saleflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."treatment_histories" ADD CONSTRAINT "treatment_histories_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "crm"."treatment_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."kpi_template_goals" ADD CONSTRAINT "kpi_template_goals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crm"."kpi_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."kpi_setups" ADD CONSTRAINT "kpi_setups_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crm"."kpi_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."kpi_goals" ADD CONSTRAINT "kpi_goals_kpi_setup_id_fkey" FOREIGN KEY ("kpi_setup_id") REFERENCES "crm"."kpi_setups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."cxm_questions" ADD CONSTRAINT "cxm_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "crm"."cxm_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."cxm_options" ADD CONSTRAINT "cxm_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "crm"."cxm_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."building_floors" ADD CONSTRAINT "building_floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "iam"."buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "iam"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."category_items" ADD CONSTRAINT "category_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "iam"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."card_service_defs" ADD CONSTRAINT "card_service_defs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "iam"."cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."tip_group_employees" ADD CONSTRAINT "tip_group_employees_tip_group_id_fkey" FOREIGN KEY ("tip_group_id") REFERENCES "iam"."tip_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."tip_group_configs" ADD CONSTRAINT "tip_group_configs_tip_group_id_fkey" FOREIGN KEY ("tip_group_id") REFERENCES "iam"."tip_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."decision_table_inputs" ADD CONSTRAINT "decision_table_inputs_decision_table_id_fkey" FOREIGN KEY ("decision_table_id") REFERENCES "bpm"."decision_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."decision_table_outputs" ADD CONSTRAINT "decision_table_outputs_decision_table_id_fkey" FOREIGN KEY ("decision_table_id") REFERENCES "bpm"."decision_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."business_partner_exchanges" ADD CONSTRAINT "business_partner_exchanges_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "crm"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."invoice_details" ADD CONSTRAINT "invoice_details_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "crm"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."guarantees" ADD CONSTRAINT "guarantees_guarantee_type_id_fkey" FOREIGN KEY ("guarantee_type_id") REFERENCES "crm"."guarantee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
