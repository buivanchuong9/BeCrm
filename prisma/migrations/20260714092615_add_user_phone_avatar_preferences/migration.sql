-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_file_id" UUID,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi-VN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notification_channels" JSONB NOT NULL DEFAULT '{"inApp":true,"email":true,"sms":false,"push":false}',
    "device_settings" JSONB NOT NULL DEFAULT '{"biometricLogin":false,"mobileNotifications":true}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
