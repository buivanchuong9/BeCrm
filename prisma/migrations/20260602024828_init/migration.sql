-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "bpm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ticket";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "warranty";

-- CreateTable
CREATE TABLE "iam"."tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "plan" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar" VARCHAR(500),
    "gender" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "resource_code" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "department_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "avatar" VARCHAR(500),
    "position" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."user_login_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "logged_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "address" TEXT,
    "avatar_url" VARCHAR(500),
    "customer_group_id" UUID,
    "customer_source_id" UUID,
    "iam_employee_id" UUID,
    "note" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "data_type" VARCHAR(30) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_readonly" BOOLEAN NOT NULL DEFAULT false,
    "is_unique" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "number_format" VARCHAR(30),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."customer_extra_infos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "attribute_def_id" UUID NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "customer_extra_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."care_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "care_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."marketing_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(30),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "marketing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_pipelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contact_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_pipeline_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "color_hex" VARCHAR(30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contact_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_attribute_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "data_type" VARCHAR(30) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_readonly" BOOLEAN NOT NULL DEFAULT false,
    "is_unique" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "number_format" VARCHAR(30),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contact_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "note" TEXT,
    "avatar_url" VARCHAR(500),
    "card_visit_front_url" VARCHAR(500),
    "card_visit_back_url" VARCHAR(500),
    "department" VARCHAR(100),
    "iam_owner_id" UUID,
    "contact_pipeline_id" UUID,
    "contact_status_id" UUID,
    "primary_customer_id" UUID,
    "extra_attributes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_extra_infos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "attribute_def_id" UUID NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "contact_extra_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "content_delta" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "contact_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contact_customer_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contact_customer_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "sale_distribution_type" VARCHAR(50),
    "division_method" INTEGER,
    "cover_url" VARCHAR(500),
    "start_date" DATE,
    "end_date" DATE,
    "position" INTEGER NOT NULL DEFAULT 0,
    "iam_owner_id" UUID NOT NULL,
    "approach_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaign_approaches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "step" INTEGER NOT NULL,
    "sla_hours" INTEGER,
    "activities" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "campaign_approaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaign_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_approach_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "campaign_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaign_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "campaign_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaign_score_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "score_value" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "campaign_score_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."campaign_sla_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "campaign_approach_id" UUID,
    "sla_hours" INTEGER NOT NULL,
    "escalation_rule" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "campaign_sla_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "campaign_approach_id" UUID,
    "contact_pipeline_id" UUID,
    "ref_type" VARCHAR(50) NOT NULL DEFAULT 'customer',
    "customer_id" UUID,
    "contact_id" UUID,
    "iam_owner_id" UUID NOT NULL,
    "iam_sale_id" UUID,
    "crm_source_id" UUID,
    "expected_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunity_processes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "campaign_approach_id" UUID,
    "note" TEXT,
    "percent" INTEGER,
    "status" VARCHAR(50),
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "opportunity_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunity_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "content_delta" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "opportunity_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunity_viewers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."opportunity_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "opportunity_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."care_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "care_category_id" UUID,
    "object_type" VARCHAR(50) NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "iam_employee_id" UUID NOT NULL,
    "content" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "care_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."marketing_automations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "trigger_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "marketing_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ma_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "marketing_automation_id" UUID NOT NULL,
    "node_type" VARCHAR(100) NOT NULL,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "node_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "ma_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ma_customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "marketing_automation_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'enrolled',
    "result_data" JSONB,
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "ma_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ma_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "marketing_automation_id" UUID NOT NULL,
    "campaign_id" UUID,
    "mapping_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "ma_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_procedures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "status" INTEGER NOT NULL DEFAULT 0,
    "division_method" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ticket_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_procedure_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "step_type" VARCHAR(30) NOT NULL DEFAULT 'task',
    "iam_department_id" UUID,
    "period" INTEGER,
    "period_unit" VARCHAR(20),
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "ticket_procedure_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_procedure_step_assignees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "ticket_procedure_step_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_procedure_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "from_step_id" UUID NOT NULL,
    "to_step_id" UUID NOT NULL,
    "condition" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "ticket_procedure_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."support_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "support_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "customer_id" UUID,
    "phone" VARCHAR(30),
    "category_id" UUID,
    "procedure_id" UUID,
    "iam_employee_id" UUID,
    "iam_creator_id" UUID,
    "iam_executor_id" UUID,
    "iam_department_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "content_delta" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "ticket_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."ticket_viewers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."support_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "iam_assignee_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "support_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."support_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "support_object_id" UUID NOT NULL,
    "iam_actor_id" UUID NOT NULL,
    "action" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "support_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket"."qr_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "link" VARCHAR(1000) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_type" INTEGER NOT NULL DEFAULT 1,
    "color_hex" VARCHAR(30),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "warranty_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_procedures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "status" INTEGER NOT NULL DEFAULT 0,
    "division_method" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "warranty_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_procedure_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "step_type" VARCHAR(30) NOT NULL DEFAULT 'task',
    "iam_department_id" UUID,
    "period" INTEGER,
    "period_unit" VARCHAR(20),
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "warranty_procedure_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_procedure_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "from_step_id" UUID NOT NULL,
    "to_step_id" UUID NOT NULL,
    "condition" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "warranty_procedure_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "customer_id" UUID,
    "phone" VARCHAR(30),
    "status_id" UUID,
    "reason_id" UUID,
    "procedure_id" UUID,
    "iam_employee_id" UUID,
    "iam_creator_id" UUID,
    "iam_department_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warranty_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "content_delta" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "warranty_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_viewers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warranty_id" UUID NOT NULL,
    "iam_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_processes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warranty_id" UUID NOT NULL,
    "status_id" UUID,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "warranty_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_support_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warranty_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "iam_assignee_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "warranty_support_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty"."warranty_support_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warranty_support_object_id" UUID NOT NULL,
    "iam_actor_id" UUID NOT NULL,
    "action" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "warranty_support_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_process_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "category" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bpm_process_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "node_key" VARCHAR(100) NOT NULL,
    "node_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "edge_key" VARCHAR(100) NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "condition" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "bpm_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_process_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "ref_type" VARCHAR(50),
    "ref_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "iam_started_by" UUID NOT NULL,
    "variables" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_process_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_task_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "iam_assignee_id" UUID,
    "claimed_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "variables" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "bpm_task_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "iam_assignee_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bpm_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_work_order_exchanges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "iam_author_id" UUID NOT NULL,
    "content" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_work_order_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_approval_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "approval_type" VARCHAR(30) NOT NULL DEFAULT 'sequential',
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bpm_approval_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID,
    "definition_id" UUID,
    "iam_approver_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "bpm_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_instance_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_node" VARCHAR(100),
    "to_node" VARCHAR(100),
    "iam_actor_id" UUID,
    "data" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "bpm_instance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."business_rules" (
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
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."business_rule_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "business_rule_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "condition" JSONB,
    "action" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "business_rule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."fcm_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "device_type" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "fcm_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notification_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "ref_type" VARCHAR(50),
    "ref_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "notification_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "title_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "iam"."tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "iam"."users"("tenant_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "iam"."roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "iam"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_resource_code_action_key" ON "iam"."role_permissions"("role_id", "resource_code", "action");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "iam"."employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_attributes_tenant_id_field_name_key" ON "iam"."customer_attributes"("tenant_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_extra_infos_customer_id_attribute_def_id_key" ON "iam"."customer_extra_infos"("customer_id", "attribute_def_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_attribute_definitions_tenant_id_field_name_key" ON "crm"."contact_attribute_definitions"("tenant_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "contact_extra_infos_contact_id_attribute_def_id_key" ON "crm"."contact_extra_infos"("contact_id", "attribute_def_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_customer_links_contact_id_customer_id_key" ON "crm"."contact_customer_links"("contact_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenant_id_code_key" ON "crm"."campaigns"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_approaches_campaign_id_step_key" ON "crm"."campaign_approaches"("campaign_id", "step");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_sales_campaign_id_iam_user_id_key" ON "crm"."campaign_sales"("campaign_id", "iam_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_viewers_opportunity_id_iam_user_id_key" ON "crm"."opportunity_viewers"("opportunity_id", "iam_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_contacts_opportunity_id_contact_id_key" ON "crm"."opportunity_contacts"("opportunity_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "ma_customers_marketing_automation_id_customer_id_key" ON "crm"."ma_customers"("marketing_automation_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_viewers_ticket_id_iam_user_id_key" ON "ticket"."ticket_viewers"("ticket_id", "iam_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_code_key" ON "ticket"."qr_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_viewers_warranty_id_iam_user_id_key" ON "warranty"."warranty_viewers"("warranty_id", "iam_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_process_templates_tenant_id_code_key" ON "bpm"."bpm_process_templates"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_nodes_template_id_node_key_key" ON "bpm"."bpm_nodes"("template_id", "node_key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_code_key" ON "notification"."notification_templates"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "iam"."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "iam"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "iam"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."user_login_logs" ADD CONSTRAINT "user_login_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."customers" ADD CONSTRAINT "customers_customer_group_id_fkey" FOREIGN KEY ("customer_group_id") REFERENCES "iam"."customer_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."customers" ADD CONSTRAINT "customers_customer_source_id_fkey" FOREIGN KEY ("customer_source_id") REFERENCES "iam"."customer_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."customer_attributes" ADD CONSTRAINT "customer_attributes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "iam"."customer_attributes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."customer_extra_infos" ADD CONSTRAINT "customer_extra_infos_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "iam"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."customer_extra_infos" ADD CONSTRAINT "customer_extra_infos_attribute_def_id_fkey" FOREIGN KEY ("attribute_def_id") REFERENCES "iam"."customer_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_statuses" ADD CONSTRAINT "contact_statuses_contact_pipeline_id_fkey" FOREIGN KEY ("contact_pipeline_id") REFERENCES "crm"."contact_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_attribute_definitions" ADD CONSTRAINT "contact_attribute_definitions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "crm"."contact_attribute_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_contact_pipeline_id_fkey" FOREIGN KEY ("contact_pipeline_id") REFERENCES "crm"."contact_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_contact_status_id_fkey" FOREIGN KEY ("contact_status_id") REFERENCES "crm"."contact_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_extra_infos" ADD CONSTRAINT "contact_extra_infos_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_extra_infos" ADD CONSTRAINT "contact_extra_infos_attribute_def_id_fkey" FOREIGN KEY ("attribute_def_id") REFERENCES "crm"."contact_attribute_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_exchanges" ADD CONSTRAINT "contact_exchanges_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contact_customer_links" ADD CONSTRAINT "contact_customer_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_approaches" ADD CONSTRAINT "campaign_approaches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_activities" ADD CONSTRAINT "campaign_activities_campaign_approach_id_fkey" FOREIGN KEY ("campaign_approach_id") REFERENCES "crm"."campaign_approaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_sales" ADD CONSTRAINT "campaign_sales_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_score_configs" ADD CONSTRAINT "campaign_score_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_sla_configs" ADD CONSTRAINT "campaign_sla_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."campaign_sla_configs" ADD CONSTRAINT "campaign_sla_configs_campaign_approach_id_fkey" FOREIGN KEY ("campaign_approach_id") REFERENCES "crm"."campaign_approaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_campaign_approach_id_fkey" FOREIGN KEY ("campaign_approach_id") REFERENCES "crm"."campaign_approaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_crm_source_id_fkey" FOREIGN KEY ("crm_source_id") REFERENCES "crm"."marketing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunities" ADD CONSTRAINT "opportunities_contact_pipeline_id_fkey" FOREIGN KEY ("contact_pipeline_id") REFERENCES "crm"."contact_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_processes" ADD CONSTRAINT "opportunity_processes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_exchanges" ADD CONSTRAINT "opportunity_exchanges_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_viewers" ADD CONSTRAINT "opportunity_viewers_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."care_histories" ADD CONSTRAINT "care_histories_care_category_id_fkey" FOREIGN KEY ("care_category_id") REFERENCES "crm"."care_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."care_histories" ADD CONSTRAINT "care_histories_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ma_nodes" ADD CONSTRAINT "ma_nodes_marketing_automation_id_fkey" FOREIGN KEY ("marketing_automation_id") REFERENCES "crm"."marketing_automations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ma_customers" ADD CONSTRAINT "ma_customers_marketing_automation_id_fkey" FOREIGN KEY ("marketing_automation_id") REFERENCES "crm"."marketing_automations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ma_mappings" ADD CONSTRAINT "ma_mappings_marketing_automation_id_fkey" FOREIGN KEY ("marketing_automation_id") REFERENCES "crm"."marketing_automations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ma_mappings" ADD CONSTRAINT "ma_mappings_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm"."campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_procedure_steps" ADD CONSTRAINT "ticket_procedure_steps_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "ticket"."ticket_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_procedure_step_assignees" ADD CONSTRAINT "ticket_procedure_step_assignees_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "ticket"."ticket_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_procedure_links" ADD CONSTRAINT "ticket_procedure_links_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "ticket"."ticket_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_procedure_links" ADD CONSTRAINT "ticket_procedure_links_from_step_id_fkey" FOREIGN KEY ("from_step_id") REFERENCES "ticket"."ticket_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_procedure_links" ADD CONSTRAINT "ticket_procedure_links_to_step_id_fkey" FOREIGN KEY ("to_step_id") REFERENCES "ticket"."ticket_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."support_configs" ADD CONSTRAINT "support_configs_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "ticket"."ticket_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket"."ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."tickets" ADD CONSTRAINT "tickets_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "ticket"."ticket_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_exchanges" ADD CONSTRAINT "ticket_exchanges_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."ticket_viewers" ADD CONSTRAINT "ticket_viewers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."support_objects" ADD CONSTRAINT "support_objects_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."support_objects" ADD CONSTRAINT "support_objects_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "ticket"."ticket_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket"."support_logs" ADD CONSTRAINT "support_logs_support_object_id_fkey" FOREIGN KEY ("support_object_id") REFERENCES "ticket"."support_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_procedure_steps" ADD CONSTRAINT "warranty_procedure_steps_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "warranty"."warranty_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_procedure_links" ADD CONSTRAINT "warranty_procedure_links_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "warranty"."warranty_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_procedure_links" ADD CONSTRAINT "warranty_procedure_links_from_step_id_fkey" FOREIGN KEY ("from_step_id") REFERENCES "warranty"."warranty_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_procedure_links" ADD CONSTRAINT "warranty_procedure_links_to_step_id_fkey" FOREIGN KEY ("to_step_id") REFERENCES "warranty"."warranty_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranties" ADD CONSTRAINT "warranties_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "warranty"."warranty_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranties" ADD CONSTRAINT "warranties_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "warranty"."warranty_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranties" ADD CONSTRAINT "warranties_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "warranty"."warranty_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_exchanges" ADD CONSTRAINT "warranty_exchanges_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "warranty"."warranties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_viewers" ADD CONSTRAINT "warranty_viewers_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "warranty"."warranties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_processes" ADD CONSTRAINT "warranty_processes_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "warranty"."warranties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_processes" ADD CONSTRAINT "warranty_processes_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "warranty"."warranty_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_support_objects" ADD CONSTRAINT "warranty_support_objects_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "warranty"."warranties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_support_objects" ADD CONSTRAINT "warranty_support_objects_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "warranty"."warranty_procedure_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty"."warranty_support_logs" ADD CONSTRAINT "warranty_support_logs_warranty_support_object_id_fkey" FOREIGN KEY ("warranty_support_object_id") REFERENCES "warranty"."warranty_support_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_nodes" ADD CONSTRAINT "bpm_nodes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_edges" ADD CONSTRAINT "bpm_edges_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_edges" ADD CONSTRAINT "bpm_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "bpm"."bpm_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_edges" ADD CONSTRAINT "bpm_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "bpm"."bpm_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_process_instances" ADD CONSTRAINT "bpm_process_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_task_tokens" ADD CONSTRAINT "bpm_task_tokens_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_task_tokens" ADD CONSTRAINT "bpm_task_tokens_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "bpm"."bpm_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_work_orders" ADD CONSTRAINT "bpm_work_orders_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_work_order_exchanges" ADD CONSTRAINT "bpm_work_order_exchanges_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "bpm"."bpm_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_approvals" ADD CONSTRAINT "bpm_approvals_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "bpm"."bpm_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_approvals" ADD CONSTRAINT "bpm_approvals_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "bpm"."bpm_approval_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_instance_history" ADD CONSTRAINT "bpm_instance_history_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."business_rule_items" ADD CONSTRAINT "business_rule_items_business_rule_id_fkey" FOREIGN KEY ("business_rule_id") REFERENCES "bpm"."business_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."fcm_devices" ADD CONSTRAINT "fcm_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
