-- CreateTable
CREATE TABLE "story_annotations" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "annotatedText" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_annotations_storyId_idx" ON "story_annotations"("storyId");

-- AddForeignKey
ALTER TABLE "story_annotations" ADD CONSTRAINT "story_annotations_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
