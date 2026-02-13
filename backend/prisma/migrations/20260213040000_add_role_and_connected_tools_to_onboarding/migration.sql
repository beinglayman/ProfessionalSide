-- AlterTable
ALTER TABLE "onboarding_data" ADD COLUMN "role" TEXT;
ALTER TABLE "onboarding_data" ADD COLUMN "connectedTools" TEXT[] DEFAULT ARRAY[]::TEXT[];
