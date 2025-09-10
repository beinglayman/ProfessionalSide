const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function importBenchmarks() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting Prisma benchmark import...');
    
    // Read the JSON export data
    const benchmarks = JSON.parse(fs.readFileSync('skill-benchmarks-export.json', 'utf8'));
    console.log(`📊 Loaded ${benchmarks.length} benchmarks`);

    // Check current count
    const currentCount = await prisma.skillBenchmark.count();
    console.log(`📈 Current benchmarks: ${currentCount}`);

    // Import in batches
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < benchmarks.length; i++) {
      const benchmark = benchmarks[i];
      
      try {
        await prisma.skillBenchmark.create({
          data: {
            id: benchmark.id,
            skillName: benchmark.skillName,
            industry: benchmark.industry,
            role: benchmark.role,
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description,
            createdAt: benchmark.createdAt ? new Date(benchmark.createdAt) : new Date(),
            updatedAt: benchmark.updatedAt ? new Date(benchmark.updatedAt) : new Date()
          }
        });
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✅ Imported ${successCount}/${benchmarks.length}`);
        }
      } catch (error) {
        if (error.code === 'P2002') {
          // Record already exists, skip
          successCount++;
        } else {
          errorCount++;
          console.log(`❌ Error importing ${benchmark.skillName}: ${error.message}`);
        }
      }
    }

    // Final verification
    const finalCount = await prisma.skillBenchmark.count();
    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Successfully imported: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Final count: ${finalCount}`);

    // Sample verification
    const sample = await prisma.skillBenchmark.findMany({ take: 3, orderBy: { skillName: 'asc' } });
    console.log(`\n🔍 Sample records:`);
    sample.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.skillName}: ${record.industryAverage}/100 (${record.marketDemand} demand)`);
    });

  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importBenchmarks();