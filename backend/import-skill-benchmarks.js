const { PrismaClient } = require('@prisma/client');
const benchmarks = require('./skill-benchmarks-export.json');

const prisma = new PrismaClient();

async function importSkillBenchmarks() {
  console.log('🎯 Starting skill benchmarks import...');
  console.log(`📊 Found ${benchmarks.length} benchmarks to import`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  try {
    for (const benchmark of benchmarks) {
      try {
        const result = await prisma.skillBenchmark.upsert({
          where: {
            skillName_industry: {
              skillName: benchmark.skillName,
              industry: benchmark.industry || 'general'
            }
          },
          update: {
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description,
            updatedAt: new Date()
          },
          create: {
            skillName: benchmark.skillName,
            industry: benchmark.industry || 'general',
            role: benchmark.role || 'general',
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description
          }
        });

        if (result.createdAt === result.updatedAt) {
          imported++;
        } else {
          updated++;
        }

        if ((imported + updated) % 100 === 0) {
          console.log(`⏳ Progress: ${imported + updated}/${benchmarks.length} processed`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error importing ${benchmark.skillName}:`, error.message);
      }
    }

    console.log(`\n🎉 Skill benchmarks import completed!`);
    console.log(`📈 Imported: ${imported} new benchmarks`);
    console.log(`🔄 Updated: ${updated} existing benchmarks`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`✅ Success rate: ${Math.round(((imported + updated) / benchmarks.length) * 100)}%`);

  } catch (error) {
    console.error('💥 Critical error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importSkillBenchmarks()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });