const { PrismaClient } = require('@prisma/client');
const benchmarks = require('./skill-benchmarks-export.json');

const prisma = new PrismaClient();

async function seedSkillBenchmarksBatch() {
  console.log('🎯 Starting skill benchmarks batch import...');
  console.log(`📊 Found ${benchmarks.length} benchmarks in export file\n`);

  try {
    // Transform data to match schema (remove id and timestamps, those will be auto-generated)
    const benchmarksToInsert = benchmarks.map(b => ({
      skillName: b.skillName,
      industry: b.industry || 'general',
      role: b.role || 'general',
      industryAverage: b.industryAverage,
      juniorLevel: b.juniorLevel,
      midLevel: b.midLevel,
      seniorLevel: b.seniorLevel,
      expertLevel: b.expertLevel,
      marketDemand: b.marketDemand,
      growthTrend: b.growthTrend || 'stable',
      description: b.description || ''
    }));

    console.log('💾 Inserting benchmarks in batch...');

    const result = await prisma.skillBenchmark.createMany({
      data: benchmarksToInsert,
      skipDuplicates: true
    });

    console.log(`\n✅ Successfully inserted ${result.count} skill benchmarks!`);

    // Verify
    const totalCount = await prisma.skillBenchmark.count();
    console.log(`📈 Total benchmarks in database: ${totalCount}`);

    // Show sample
    console.log('\n📋 Sample benchmarks:');
    const samples = await prisma.skillBenchmark.findMany({
      take: 5,
      orderBy: { skillName: 'asc' }
    });

    samples.forEach(s => {
      console.log(`   ${s.skillName}: Industry Avg=${s.industryAverage}, Senior=${s.seniorLevel}, Demand=${s.marketDemand}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSkillBenchmarksBatch();
