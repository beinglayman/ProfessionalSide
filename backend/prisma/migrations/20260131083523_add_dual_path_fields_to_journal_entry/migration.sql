-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "activityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "groupingMethod" TEXT DEFAULT 'time',
ADD COLUMN     "lastGroupingEditAt" TIMESTAMP(3),
ADD COLUMN     "timeRangeEnd" TIMESTAMP(3),
ADD COLUMN     "timeRangeStart" TIMESTAMP(3);
