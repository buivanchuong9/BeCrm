ALTER TABLE "workflow_template_versions"
ADD COLUMN "terminal_edges" JSONB NOT NULL DEFAULT '[]'::jsonb;
