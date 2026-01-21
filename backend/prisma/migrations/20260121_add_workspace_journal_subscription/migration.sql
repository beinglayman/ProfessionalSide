-- CreateTable
CREATE TABLE "workspace_journal_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL,
    "selectedDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generationTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "selectedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customPrompt" TEXT,
    "defaultCategory" TEXT,
    "defaultTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_journal_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_journal_subscriptions_nextRunAt_isActive_idx" ON "workspace_journal_subscriptions"("nextRunAt", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_journal_subscriptions_userId_workspaceId_key" ON "workspace_journal_subscriptions"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "workspace_journal_subscriptions" ADD CONSTRAINT "workspace_journal_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_journal_subscriptions" ADD CONSTRAINT "workspace_journal_subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
