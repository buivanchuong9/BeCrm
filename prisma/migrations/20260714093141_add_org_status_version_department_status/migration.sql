-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "status" "ClinicLocationStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "status" "ClinicLocationStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
