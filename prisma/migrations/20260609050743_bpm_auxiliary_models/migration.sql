-- CreateTable
CREATE TABLE "bpm"."bpm_state_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "state_code" VARCHAR(50) NOT NULL,
    "state_name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_state_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_variable_declares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL DEFAULT 'String',
    "default_value" TEXT,
    "description" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_variable_declares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_variable_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "declare_id" UUID,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "value" JSONB,
    "node_key" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_variable_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_workflow_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "step_name" VARCHAR(255) NOT NULL,
    "step_number" INTEGER NOT NULL,
    "state_code" VARCHAR(50) NOT NULL,
    "state_name" VARCHAR(255) NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_workflow_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_process_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "uri" VARCHAR(500) NOT NULL,
    "process_code" VARCHAR(100),
    "process_name" VARCHAR(255),
    "template_id" UUID,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_process_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_service_levels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "node_key" VARCHAR(100),
    "name" VARCHAR(255),
    "code" VARCHAR(100),
    "sla_type" VARCHAR(10) NOT NULL DEFAULT 'SLA',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "duration_unit" VARCHAR(20) NOT NULL DEFAULT 'hours',
    "status" INTEGER NOT NULL DEFAULT 1,
    "escalation_action" JSONB,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_service_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_service_level_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "service_level_id" UUID,
    "instance_id" UUID,
    "pot_id" VARCHAR(100),
    "node_key" VARCHAR(100),
    "status" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "breached_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_service_level_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "object_type" VARCHAR(50),
    "status" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_triggers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "trigger_type" VARCHAR(50),
    "event_name" VARCHAR(100),
    "status" INTEGER NOT NULL DEFAULT 0,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "condition" JSONB,
    "action" JSONB,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_assignment_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "node_key" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "rule_type" VARCHAR(50),
    "assignee_type" VARCHAR(50),
    "assignee_ref" VARCHAR(100),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_assignment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_segment_filters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "filter_type" VARCHAR(50),
    "expression" JSONB,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_segment_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_artifact_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "type" VARCHAR(30) NOT NULL DEFAULT 'grid',
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_artifact_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_form_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "node_key" VARCHAR(100) NOT NULL,
    "pot_id" VARCHAR(100),
    "instance_id" UUID,
    "template_id" UUID,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_form_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_form_popups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "node_key" VARCHAR(100),
    "bpm_form_id" UUID,
    "title" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100),
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_form_popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_processed_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "name" VARCHAR(500),
    "code" VARCHAR(100),
    "pot_id" VARCHAR(100),
    "customer_name" VARCHAR(255),
    "patient_name" VARCHAR(255),
    "main_diagnosis" VARCHAR(500),
    "priority" VARCHAR(20),
    "iam_employee_id" UUID,
    "employee_name" VARCHAR(255),
    "status" INTEGER NOT NULL DEFAULT 0,
    "sheet_id" INTEGER,
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bpm_processed_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpm"."bpm_file_uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_url" VARCHAR(1000) NOT NULL,
    "storage_path" VARCHAR(1000),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "ref_type" VARCHAR(50),
    "ref_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "bpm_file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bpm_state_mappings_tenant_id_idx" ON "bpm"."bpm_state_mappings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_state_mappings_tenant_id_state_code_key" ON "bpm"."bpm_state_mappings"("tenant_id", "state_code");

-- CreateIndex
CREATE INDEX "bpm_variable_declares_tenant_id_idx" ON "bpm"."bpm_variable_declares"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_variable_declares_template_id_code_key" ON "bpm"."bpm_variable_declares"("template_id", "code");

-- CreateIndex
CREATE INDEX "bpm_variable_instances_instance_id_idx" ON "bpm"."bpm_variable_instances"("instance_id");

-- CreateIndex
CREATE INDEX "bpm_variable_instances_tenant_id_code_idx" ON "bpm"."bpm_variable_instances"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "bpm_workflow_statuses_tenant_id_template_id_idx" ON "bpm"."bpm_workflow_statuses"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "bpm_process_permissions_tenant_id_idx" ON "bpm"."bpm_process_permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "bpm_service_levels_tenant_id_sla_type_idx" ON "bpm"."bpm_service_levels"("tenant_id", "sla_type");

-- CreateIndex
CREATE INDEX "bpm_service_level_histories_tenant_id_instance_id_idx" ON "bpm"."bpm_service_level_histories"("tenant_id", "instance_id");

-- CreateIndex
CREATE INDEX "bpm_objects_tenant_id_idx" ON "bpm"."bpm_objects"("tenant_id");

-- CreateIndex
CREATE INDEX "bpm_triggers_tenant_id_idx" ON "bpm"."bpm_triggers"("tenant_id");

-- CreateIndex
CREATE INDEX "bpm_assignment_rules_tenant_id_template_id_idx" ON "bpm"."bpm_assignment_rules"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "bpm_segment_filters_tenant_id_idx" ON "bpm"."bpm_segment_filters"("tenant_id");

-- CreateIndex
CREATE INDEX "bpm_artifact_data_tenant_id_idx" ON "bpm"."bpm_artifact_data"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_artifact_data_tenant_id_code_key" ON "bpm"."bpm_artifact_data"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "bpm_form_data_tenant_id_node_key_pot_id_idx" ON "bpm"."bpm_form_data"("tenant_id", "node_key", "pot_id");

-- CreateIndex
CREATE INDEX "bpm_form_data_instance_id_idx" ON "bpm"."bpm_form_data"("instance_id");

-- CreateIndex
CREATE INDEX "bpm_form_popups_tenant_id_template_id_idx" ON "bpm"."bpm_form_popups"("tenant_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "bpm_processed_objects_instance_id_key" ON "bpm"."bpm_processed_objects"("instance_id");

-- CreateIndex
CREATE INDEX "bpm_processed_objects_tenant_id_pot_id_idx" ON "bpm"."bpm_processed_objects"("tenant_id", "pot_id");

-- CreateIndex
CREATE INDEX "bpm_file_uploads_tenant_id_ref_type_ref_id_idx" ON "bpm"."bpm_file_uploads"("tenant_id", "ref_type", "ref_id");

-- AddForeignKey
ALTER TABLE "bpm"."bpm_variable_declares" ADD CONSTRAINT "bpm_variable_declares_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_variable_instances" ADD CONSTRAINT "bpm_variable_instances_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_variable_instances" ADD CONSTRAINT "bpm_variable_instances_declare_id_fkey" FOREIGN KEY ("declare_id") REFERENCES "bpm"."bpm_variable_declares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_workflow_statuses" ADD CONSTRAINT "bpm_workflow_statuses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_process_permissions" ADD CONSTRAINT "bpm_process_permissions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_service_levels" ADD CONSTRAINT "bpm_service_levels_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_service_level_histories" ADD CONSTRAINT "bpm_service_level_histories_service_level_id_fkey" FOREIGN KEY ("service_level_id") REFERENCES "bpm"."bpm_service_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_service_level_histories" ADD CONSTRAINT "bpm_service_level_histories_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_objects" ADD CONSTRAINT "bpm_objects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_triggers" ADD CONSTRAINT "bpm_triggers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_assignment_rules" ADD CONSTRAINT "bpm_assignment_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_segment_filters" ADD CONSTRAINT "bpm_segment_filters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_form_data" ADD CONSTRAINT "bpm_form_data_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_form_popups" ADD CONSTRAINT "bpm_form_popups_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bpm"."bpm_process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpm"."bpm_processed_objects" ADD CONSTRAINT "bpm_processed_objects_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "bpm"."bpm_process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
