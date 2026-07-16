-- CreateEnum
CREATE TYPE "WorkflowTemplateStatus" AS ENUM ('draft', 'in_review', 'published', 'deprecated', 'archived');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('created', 'active', 'suspended', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('pending', 'blocked', 'ready', 'assigned', 'accepted', 'in_progress', 'waiting_for_patient', 'waiting_for_result', 'waiting_for_approval', 'completed', 'failed', 'rejected', 'redo_required', 'skipped', 'cancelled', 'expired', 'escalated');

-- CreateEnum
CREATE TYPE "WorkflowPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "latest_published_version_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_template_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "WorkflowTemplateStatus" NOT NULL DEFAULT 'draft',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "node_positions" JSONB,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "workflow_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "instance_code" TEXT NOT NULL,
    "integrity_hash" TEXT NOT NULL,
    "identity_version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'active',
    "activated_by" UUID NOT NULL,
    "activated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "suspended_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instance_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "step_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsible_role" "UserRole" NOT NULL,
    "department" TEXT NOT NULL,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'pending',
    "assignee_id" UUID,
    "depends_on_step_codes" TEXT[],
    "sla_minutes" INTEGER NOT NULL,
    "priority" "WorkflowPriority" NOT NULL DEFAULT 'medium',
    "urgency" "Urgency" NOT NULL DEFAULT 'routine',
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "clinical_warning" TEXT,
    "rework_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_templates_organization_id_specialty_idx" ON "workflow_templates"("organization_id", "specialty");

-- CreateIndex
CREATE INDEX "workflow_template_versions_template_id_idx" ON "workflow_template_versions"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_template_versions_template_id_version_number_key" ON "workflow_template_versions"("template_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_encounter_id_key" ON "workflow_instances"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_instance_code_key" ON "workflow_instances"("instance_code");

-- CreateIndex
CREATE INDEX "workflow_instances_patient_id_idx" ON "workflow_instances"("patient_id");

-- CreateIndex
CREATE INDEX "workflow_tasks_instance_id_idx" ON "workflow_tasks"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_tasks_encounter_id_idx" ON "workflow_tasks"("encounter_id");

-- CreateIndex
CREATE INDEX "workflow_tasks_responsible_role_department_status_idx" ON "workflow_tasks"("responsible_role", "department", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_assignee_id_status_idx" ON "workflow_tasks"("assignee_id", "status");

-- AddForeignKey
ALTER TABLE "workflow_template_versions" ADD CONSTRAINT "workflow_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "workflow_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
