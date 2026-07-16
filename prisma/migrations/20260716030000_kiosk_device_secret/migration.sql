-- AlterTable
ALTER TABLE "kiosk_devices" ADD COLUMN "secret_hash" TEXT NOT NULL DEFAULT '';

-- The DEFAULT '' above only exists to satisfy the NOT NULL constraint against
-- the (currently empty, pre-launch) table; drop it immediately so future rows
-- must supply a real hash — this is not a usable "empty secret" credential
-- since KioskDevicesService always generates one and no row exists yet.
ALTER TABLE "kiosk_devices" ALTER COLUMN "secret_hash" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_devices_secret_hash_key" ON "kiosk_devices"("secret_hash");
