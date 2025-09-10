const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateBenchmarksToProduction() {
  try {
    console.log('🚀 Starting benchmark migration to production database...\n');

    // Read the exported JSON data
    const exportFile = path.join(__dirname, 'skill-benchmarks-export.json');
    
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      console.log('   Please run: node export-benchmark-data.js first');
      return;
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📊 Loaded ${benchmarks.length} benchmarks from export file`);

    // Check current production state
    const existingCount = await prisma.skillBenchmark.count();
    console.log(`📈 Current production benchmarks: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Production already has benchmark data');
      console.log('   This migration will upsert (update existing, create new)');
    }

    // Prepare for batch processing
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < benchmarks.length; i += batchSize) {
      batches.push(benchmarks.slice(i, i + batchSize));
    }

    console.log(`\n📦 Processing ${batches.length} batches of ${batchSize} records each`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length}`);

      // Use transaction for batch integrity
      await prisma.$transaction(async (tx) => {
        for (const benchmark of batch) {
          try {
            await tx.skillBenchmark.upsert({
              where: {
                id: benchmark.id
              },
              update: {
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
                updatedAt: new Date()
              },
              create: {
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
            process.stdout.write('✅');
          } catch (error) {
            errorCount++;
            errors.push({
              skillName: benchmark.skillName,
              error: error.message
            });
            process.stdout.write('❌');
          }
        }
      });

      // Small delay between batches to be production-friendly
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final verification
    const finalCount = await prisma.skillBenchmark.count();
    console.log(`\n\n🎉 Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Successfully processed: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Final benchmark count: ${finalCount}`);
    console.log(`   - Success rate: ${Math.round((successCount / benchmarks.length) * 100)}%`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n❌ First ${Math.min(10, errors.length)} errors:`);
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.skillName}: ${error.error}`);
      });
    }

    // Sample verification
    console.log(`\n🔍 Sample migrated records:`);
    const sampleRecords = await prisma.skillBenchmark.findMany({
      take: 3,
      orderBy: { skillName: 'asc' },
      select: {
        skillName: true,
        industryAverage: true,
        marketDemand: true,
        growthTrend: true
      }
    });

    sampleRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.skillName}: ${record.industryAverage}/100 (${record.marketDemand} demand, ${record.growthTrend} trend)`);
    });

  } catch (error) {
    console.error('💥 Critical migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateBenchmarksToProduction();
}

module.exports = { migrateBenchmarksToProduction };