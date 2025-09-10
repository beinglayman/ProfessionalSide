-- Create SkillBenchmark table manually
CREATE TABLE IF NOT EXISTS "SkillBenchmark" (
    "id" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'general',
    "role" TEXT NOT NULL DEFAULT 'general',
    "industryAverage" INTEGER NOT NULL,
    "juniorLevel" INTEGER NOT NULL,
    "midLevel" INTEGER NOT NULL,
    "seniorLevel" INTEGER NOT NULL,
    "expertLevel" INTEGER NOT NULL,
    "marketDemand" TEXT NOT NULL,
    "growthTrend" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillBenchmark_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "SkillBenchmark_skillName_industry_key" ON "SkillBenchmark"("skillName", "industry");

-- Verify table creation
SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'SkillBenchmark';