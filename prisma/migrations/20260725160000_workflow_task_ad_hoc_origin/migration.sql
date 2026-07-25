-- CreateEnum
CREATE TYPE "WorkflowTaskOrigin" AS ENUM ('template', 'ad_hoc');

-- AlterTable
ALTER TABLE "workflow_tasks"
  ADD COLUMN "origin" "WorkflowTaskOrigin" NOT NULL DEFAULT 'template',
  ADD COLUMN "created_by" UUID;
