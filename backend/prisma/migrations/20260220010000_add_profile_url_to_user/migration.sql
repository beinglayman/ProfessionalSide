-- AlterTable
ALTER TABLE "users" ADD COLUMN "profileUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_profileUrl_key" ON "users"("profileUrl");
