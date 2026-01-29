-- CreateTable
CREATE TABLE "skill_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rawLevel" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'monthly',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_snapshots_userId_snapshotDate_idx" ON "skill_snapshots"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "skill_snapshots_skillId_idx" ON "skill_snapshots"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_snapshots_userId_skillId_snapshotDate_key" ON "skill_snapshots"("userId", "skillId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "skill_snapshots" ADD CONSTRAINT "skill_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_snapshots" ADD CONSTRAINT "skill_snapshots_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "credit_products_stripePriceId_key" RENAME TO "credit_products_razorpayPlanId_key";

-- RenameIndex
ALTER INDEX "user_subscriptions_stripeSubscriptionId_key" RENAME TO "user_subscriptions_razorpaySubscriptionId_key";
