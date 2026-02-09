-- CreateTable
CREATE TABLE "story_derivations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "text" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "speakingTimeSec" INTEGER,
    "tone" TEXT,
    "customPrompt" TEXT,
    "framework" TEXT,
    "archetype" TEXT,
    "model" TEXT NOT NULL,
    "processingTimeMs" INTEGER NOT NULL,
    "featureCode" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_derivations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_derivations_userId_createdAt_idx" ON "story_derivations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "story_derivations_userId_kind_idx" ON "story_derivations"("userId", "kind");

-- AddForeignKey
ALTER TABLE "story_derivations" ADD CONSTRAINT "story_derivations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
