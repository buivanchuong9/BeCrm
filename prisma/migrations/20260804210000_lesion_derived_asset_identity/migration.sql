ALTER TABLE "lesion_image_assets"
  ADD COLUMN "derivation_key" TEXT;

CREATE UNIQUE INDEX "lesion_image_assets_derivation_key_key"
  ON "lesion_image_assets"("derivation_key");

COMMENT ON COLUMN "lesion_image_assets"."derivation_key" IS
  'Stable comparison/observation/type identity for idempotent derived assets. NULL for immutable originals and legacy assets.';
