-- DropForeignKey (demo_career_stories -> demo_story_clusters)
ALTER TABLE "demo_career_stories" DROP CONSTRAINT IF EXISTS "demo_career_stories_clusterId_fkey";

-- DropForeignKey (demo_journal_entries -> users)
ALTER TABLE "demo_journal_entries" DROP CONSTRAINT IF EXISTS "demo_journal_entries_userId_fkey";

-- DropForeignKey (demo_tool_activities -> demo_story_clusters)
ALTER TABLE "demo_tool_activities" DROP CONSTRAINT IF EXISTS "demo_tool_activities_clusterId_fkey";

-- DropColumn (demo_tool_activities.clusterId)
ALTER TABLE "demo_tool_activities" DROP COLUMN IF EXISTS "clusterId";

-- DropTable
DROP TABLE IF EXISTS "demo_career_stories";

-- DropTable
DROP TABLE IF EXISTS "demo_journal_entries";

-- DropTable
DROP TABLE IF EXISTS "demo_story_clusters";

-- Note: Only DemoToolActivity remains for source-level demo data
-- Clustering is now stored inline in JournalEntry (activityIds, groupingMethod, clusterRef)
-- The unified models (CareerStory, JournalEntry) use sourceMode field for demo/production routing
