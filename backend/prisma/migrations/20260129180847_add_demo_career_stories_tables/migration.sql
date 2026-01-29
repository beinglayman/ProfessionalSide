-- CreateTable
CREATE TABLE "demo_tool_activities" (
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

    CONSTRAINT "demo_tool_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_story_clusters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_story_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_career_stories" (
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

    CONSTRAINT "demo_career_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_tool_activities_userId_timestamp_idx" ON "demo_tool_activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "demo_tool_activities_clusterId_idx" ON "demo_tool_activities"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "demo_tool_activities_userId_source_sourceId_key" ON "demo_tool_activities"("userId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "demo_story_clusters_userId_idx" ON "demo_story_clusters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "demo_career_stories_clusterId_key" ON "demo_career_stories"("clusterId");

-- AddForeignKey
ALTER TABLE "demo_tool_activities" ADD CONSTRAINT "demo_tool_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_tool_activities" ADD CONSTRAINT "demo_tool_activities_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "demo_story_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_story_clusters" ADD CONSTRAINT "demo_story_clusters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_career_stories" ADD CONSTRAINT "demo_career_stories_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "demo_story_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
