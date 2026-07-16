-- CreateEnum
CREATE TYPE "AIAssessmentStatus" AS ENUM ('completed', 'insufficient_data', 'failed');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('routine', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "DoctorReviewAction" AS ENUM ('pending', 'accepted', 'partial', 'rejected');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('none', 'provisional', 'differential', 'confirmed', 'revised', 'signed');

-- CreateEnum
CREATE TYPE "ClinicalOrderType" AS ENUM ('laboratory', 'imaging', 'consultation');

-- CreateEnum
CREATE TYPE "ClinicalOrderStatus" AS ENUM ('requested', 'in_progress', 'invalid_sample', 'result_ready', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "symptom_intakes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "chief_complaint" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "symptoms" TEXT[],
    "history" TEXT[],
    "current_medication" TEXT[],
    "images" TEXT[],
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_preliminary_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "intake_id" UUID NOT NULL,
    "status" "AIAssessmentStatus" NOT NULL,
    "candidate_conditions" JSONB NOT NULL,
    "red_flag_triggered" BOOLEAN NOT NULL,
    "red_flag_urgency" "Urgency",
    "red_flag_reasons" TEXT[],
    "suggested_specialty" TEXT,
    "suggested_next_actions" TEXT[],
    "model_version" TEXT NOT NULL,
    "missing_data_hints" TEXT[],
    "superseded_by_id" UUID,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_preliminary_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "ai_assessment_id" UUID,
    "doctor_id" UUID NOT NULL,
    "action" "DoctorReviewAction" NOT NULL,
    "accepted_condition_code" TEXT,
    "rationale" TEXT,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_diagnoses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "status" "DiagnosisStatus" NOT NULL,
    "condition_name" TEXT NOT NULL,
    "condition_code" TEXT,
    "ai_assessment_id" UUID,
    "is_additional_to_ai" BOOLEAN NOT NULL,
    "rationale" TEXT,
    "revision_of_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "diagnosis_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "approved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL,
    "type" "ClinicalOrderType" NOT NULL,
    "ordered_by_doctor_id" UUID NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "ClinicalOrderStatus" NOT NULL DEFAULT 'requested',
    "assigned_role" "UserRole" NOT NULL,
    "invalid_sample_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clinical_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "abnormal" BOOLEAN NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,

    CONSTRAINT "clinical_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symptom_intakes_encounter_id_idx" ON "symptom_intakes"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_preliminary_assessments_intake_id_key" ON "ai_preliminary_assessments"("intake_id");

-- CreateIndex
CREATE INDEX "ai_preliminary_assessments_encounter_id_idx" ON "ai_preliminary_assessments"("encounter_id");

-- CreateIndex
CREATE INDEX "doctor_reviews_encounter_id_idx" ON "doctor_reviews"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_diagnoses_revision_of_id_key" ON "doctor_diagnoses"("revision_of_id");

-- CreateIndex
CREATE INDEX "doctor_diagnoses_encounter_id_idx" ON "doctor_diagnoses"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_plans_encounter_id_key" ON "clinical_plans"("encounter_id");

-- CreateIndex
CREATE INDEX "clinical_orders_encounter_id_idx" ON "clinical_orders"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_results_order_id_key" ON "clinical_results"("order_id");

-- AddForeignKey
ALTER TABLE "symptom_intakes" ADD CONSTRAINT "symptom_intakes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_preliminary_assessments" ADD CONSTRAINT "ai_preliminary_assessments_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_preliminary_assessments" ADD CONSTRAINT "ai_preliminary_assessments_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "symptom_intakes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_preliminary_assessments" ADD CONSTRAINT "ai_preliminary_assessments_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "ai_preliminary_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_ai_assessment_id_fkey" FOREIGN KEY ("ai_assessment_id") REFERENCES "ai_preliminary_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_diagnoses" ADD CONSTRAINT "doctor_diagnoses_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_diagnoses" ADD CONSTRAINT "doctor_diagnoses_ai_assessment_id_fkey" FOREIGN KEY ("ai_assessment_id") REFERENCES "ai_preliminary_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_diagnoses" ADD CONSTRAINT "doctor_diagnoses_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "doctor_diagnoses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_plans" ADD CONSTRAINT "clinical_plans_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_plans" ADD CONSTRAINT "clinical_plans_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "doctor_diagnoses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_orders" ADD CONSTRAINT "clinical_orders_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "medical_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_results" ADD CONSTRAINT "clinical_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "clinical_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
