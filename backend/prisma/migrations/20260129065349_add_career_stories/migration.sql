-- AlterTable
ALTER TABLE "workspace_journal_subscriptions" ALTER COLUMN "frequency" SET DEFAULT 'custom';

-- CreateTable
CREATE TABLE "tool_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "crossToolRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clusterId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_clusters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_stories" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "situation" JSONB NOT NULL,
    "task" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "verification" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_activities_userId_timestamp_idx" ON "tool_activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "tool_activities_clusterId_idx" ON "tool_activities"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_activities_userId_source_sourceId_key" ON "tool_activities"("userId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "story_clusters_userId_idx" ON "story_clusters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "career_stories_clusterId_key" ON "career_stories"("clusterId");

-- AddForeignKey
ALTER TABLE "tool_activities" ADD CONSTRAINT "tool_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_activities" ADD CONSTRAINT "tool_activities_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "story_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_stories" ADD CONSTRAINT "career_stories_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "story_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
