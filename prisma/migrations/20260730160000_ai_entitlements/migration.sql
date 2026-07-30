-- Persisted AI plan catalog and per-patient entitlement.
CREATE TYPE "AiUsageStatus" AS ENUM ('reserved', 'completed', 'released');
CREATE TYPE "AiAllowanceKind" AS ENUM ('included', 'purchased');
CREATE TYPE "AiPurchaseRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE "ai_plans" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annual_price_vnd" INTEGER NOT NULL,
    "monthly_included_credits" INTEGER,
    "extra_credit_unit_price_vnd" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_plans_pkey" PRIMARY KEY ("code"),
    CONSTRAINT "ai_plans_prices_check"
      CHECK ("annual_price_vnd" >= 0 AND "extra_credit_unit_price_vnd" >= 0),
    CONSTRAINT "ai_plans_quota_check"
      CHECK ("monthly_included_credits" IS NULL OR "monthly_included_credits" >= 0)
);

INSERT INTO "ai_plans"
  ("code", "name", "annual_price_vnd", "monthly_included_credits",
   "extra_credit_unit_price_vnd", "description", "features", "sort_order", "updated_at")
VALUES
  ('free', 'Free', 0, 3, 6900,
   'Bắt đầu miễn phí — phù hợp để trải nghiệm hệ thống cơ bản.',
   '["Quản lý hồ sơ sức khỏe cá nhân","Lưu trữ lịch sử khám và đơn thuốc","Cập nhật các chỉ số cơ thể cơ bản","Nhận thông báo nhắc lịch khám định kỳ"]'::jsonb,
   0, CURRENT_TIMESTAMP),
  ('plus', 'Plus', 299000, 30, 5900,
   'Gói phổ thông — dành cho theo dõi sức khỏe thường xuyên.',
   '["Tất cả tính năng gói Free","Phân tích tổn thương bằng AI (30 lượt/tháng)","Cảnh báo nguy cơ & theo dõi tiến triển","Hỗ trợ tư vấn bác sĩ ưu tiên"]'::jsonb,
   10, CURRENT_TIMESTAMP),
  ('pro', 'Pro', 599000, 100, 4900,
   'Gói nâng cao — đầy đủ công cụ theo dõi điều trị da liễu.',
   '["Tất cả tính năng gói Plus","Phân tích tổn thương bằng AI (100 lượt/tháng)","Báo cáo chuyên sâu cho bác sĩ","Định danh bảo mật VNeID tích hợp"]'::jsonb,
   20, CURRENT_TIMESTAMP),
  ('max', 'Max', 1299000, NULL, 0,
   'Gói không giới hạn — bảo vệ toàn diện cho gia đình.',
   '["Không giới hạn phân tích AI","Hồ sơ y tế điện tử trọn đời","Hỗ trợ 24/7 trực tiếp từ chuyên gia","Quyền truy cập tính năng mới sớm nhất"]'::jsonb,
   30, CURRENT_TIMESTAMP);

CREATE TABLE "patient_ai_entitlements" (
    "patient_id" UUID NOT NULL,
    "plan_code" TEXT NOT NULL DEFAULT 'free',
    "extra_credit_balance" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "patient_ai_entitlements_pkey" PRIMARY KEY ("patient_id"),
    CONSTRAINT "patient_ai_entitlements_extra_credit_check" CHECK ("extra_credit_balance" >= 0)
);

CREATE TABLE "ai_usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "case_id" UUID,
    "request_id" TEXT,
    "allowance_kind" "AiAllowanceKind" NOT NULL,
    "status" "AiUsageStatus" NOT NULL DEFAULT 'reserved',
    "reserved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurred_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,
    "release_reason" TEXT,
    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_credit_purchase_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "credits" INTEGER NOT NULL,
    "unit_price_vnd" INTEGER NOT NULL,
    "total_price_vnd" INTEGER NOT NULL,
    "status" "AiPurchaseRequestStatus" NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_credit_purchase_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_credit_purchase_values_check"
      CHECK ("credits" BETWEEN 1 AND 1000 AND "unit_price_vnd" >= 0 AND "total_price_vnd" >= 0)
);

CREATE TABLE "ai_plan_change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_plan_code" TEXT NOT NULL,
    "quoted_price_vnd" INTEGER NOT NULL,
    "status" "AiPurchaseRequestStatus" NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ai_plan_change_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_plan_change_price_check" CHECK ("quoted_price_vnd" >= 0)
);

CREATE UNIQUE INDEX "ai_usage_events_case_id_key" ON "ai_usage_events"("case_id");
CREATE UNIQUE INDEX "ai_usage_events_request_id_key" ON "ai_usage_events"("request_id");
CREATE INDEX "patient_ai_entitlements_plan_code_idx" ON "patient_ai_entitlements"("plan_code");
CREATE INDEX "ai_usage_events_patient_id_status_reserved_at_idx"
  ON "ai_usage_events"("patient_id", "status", "reserved_at");
CREATE INDEX "ai_credit_purchase_requests_patient_id_status_created_at_idx"
  ON "ai_credit_purchase_requests"("patient_id", "status", "created_at");
CREATE INDEX "ai_plan_change_requests_patient_id_status_created_at_idx"
  ON "ai_plan_change_requests"("patient_id", "status", "created_at");

ALTER TABLE "patient_ai_entitlements"
  ADD CONSTRAINT "patient_ai_entitlements_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_ai_entitlements"
  ADD CONSTRAINT "patient_ai_entitlements_plan_code_fkey"
  FOREIGN KEY ("plan_code") REFERENCES "ai_plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_usage_events"
  ADD CONSTRAINT "ai_usage_events_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_usage_events"
  ADD CONSTRAINT "ai_usage_events_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "ai_skin_analysis_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_credit_purchase_requests"
  ADD CONSTRAINT "ai_credit_purchase_requests_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_plan_change_requests"
  ADD CONSTRAINT "ai_plan_change_requests_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_plan_change_requests"
  ADD CONSTRAINT "ai_plan_change_requests_requested_plan_code_fkey"
  FOREIGN KEY ("requested_plan_code") REFERENCES "ai_plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing patients start on the persisted Free entitlement.
INSERT INTO "patient_ai_entitlements"
  ("patient_id", "plan_code", "extra_credit_balance", "version", "updated_at")
SELECT "id", 'free', 0, 1, CURRENT_TIMESTAMP
FROM "patients"
ON CONFLICT ("patient_id") DO NOTHING;
