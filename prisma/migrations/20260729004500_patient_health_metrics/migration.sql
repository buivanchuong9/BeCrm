ALTER TABLE "patients"
  ADD COLUMN "height_cm" DECIMAL(5,2),
  ADD COLUMN "weight_kg" DECIMAL(5,2);

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_height_cm_range"
    CHECK ("height_cm" IS NULL OR ("height_cm" >= 50 AND "height_cm" <= 250)),
  ADD CONSTRAINT "patients_weight_kg_range"
    CHECK ("weight_kg" IS NULL OR ("weight_kg" >= 2 AND "weight_kg" <= 500));
