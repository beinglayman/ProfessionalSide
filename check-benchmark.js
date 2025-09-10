import { PrismaClient } from '@prisma/client';

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
        skillId: skill.id
      }
    });

    if (!benchmark) {
      console.log('❌ No benchmark data found for Data Visualization');
      return;
    }

    console.log('\n📊 Data Visualization Benchmark Data:');
    console.log('=====================================');
    console.log(`Skill Name: ${skill.name}`);
    console.log(`Average Salary: $${benchmark.averageSalary?.toLocaleString() || 'N/A'}`);
    console.log(`Market Demand: ${benchmark.marketDemand}`);
    console.log(`Growth Trend: ${benchmark.growthTrend}`);
    console.log(`Difficulty: ${benchmark.difficulty}`);
    console.log(`Time to Learn: ${benchmark.timeToLearn}`);
    console.log(`Source: ${benchmark.source}`);
    console.log(`Last Updated: ${benchmark.lastUpdated}`);
    
    if (benchmark.relatedSkills) {
      console.log(`Related Skills: ${benchmark.relatedSkills.join(', ')}`);
    }
    
    if (benchmark.industryBreakdown) {
      console.log('\n🏢 Industry Breakdown:');
      Object.entries(benchmark.industryBreakdown).forEach(([industry, percentage]) => {
        console.log(`  • ${industry}: ${percentage}%`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking benchmark data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataVisualizationBenchmark();