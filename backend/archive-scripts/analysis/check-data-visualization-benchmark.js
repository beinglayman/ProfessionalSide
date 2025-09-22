const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataVisualizationBenchmark() {
  try {
    console.log('🔍 Checking Data Visualization benchmark data...\n');

    // Find the skill first
    const skill = await prisma.skill.findFirst({
      where: {
        name: 'Data Visualization'
      }
    });

    if (!skill) {
      console.log('❌ Data Visualization skill not found');
      return;
    }

    console.log('✅ Found skill:', skill.name);

    // Find the benchmark
    const benchmark = await prisma.skillBenchmark.findFirst({
      where: {
        skillName: 'Data Visualization'
      }
    });

    if (!benchmark) {
      console.log('❌ No benchmark data found for Data Visualization');
      return;
    }

    console.log('\n📊 Data Visualization Benchmark Data:');
    console.log('=====================================');
    console.log(`Skill Name: ${benchmark.skillName}`);
    console.log(`Industry: ${benchmark.industry}`);
    console.log(`Role: ${benchmark.role}`);
    console.log(`Industry Average: ${benchmark.industryAverage}/100`);
    console.log(`Junior Level: ${benchmark.juniorLevel}/100`);
    console.log(`Mid Level: ${benchmark.midLevel}/100`);
    console.log(`Senior Level: ${benchmark.seniorLevel}/100`);
    console.log(`Expert Level: ${benchmark.expertLevel}/100`);
    console.log(`Market Demand: ${benchmark.marketDemand}`);
    console.log(`Growth Trend: ${benchmark.growthTrend}`);
    console.log(`Description: ${benchmark.description}`);
    console.log(`Created At: ${benchmark.createdAt}`);
    console.log(`Updated At: ${benchmark.updatedAt}`);

  } catch (error) {
    console.error('❌ Error checking benchmark data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataVisualizationBenchmark();