const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function executePrismaMigration() {
  let prisma;
  
  try {
    console.log('🚀 Starting Prisma-based migration to Railway production...\n');

    // Initialize Prisma client
    prisma = new PrismaClient();
    console.log('✅ Prisma client initialized');

    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to production database');

    // Check current benchmark count
    const currentCount = await prisma.skillBenchmark.count();
    console.log(`📊 Current benchmarks in production: ${currentCount}`);

    // Read JSON export data
    const exportFile = path.join(__dirname, 'skill-benchmarks-export.json');
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      return;
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📄 Loaded ${benchmarks.length} benchmarks from export`);

    // Process in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log(`\n📦 Processing ${Math.ceil(benchmarks.length / batchSize)} batches...`);

    for (let i = 0; i < benchmarks.length; i += batchSize) {
      const batch = benchmarks.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(benchmarks.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);

      for (const benchmark of batch) {
        try {
          await prisma.skillBenchmark.upsert({
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

      // Small delay between batches
      if (i + batchSize < benchmarks.length) {
        console.log('\n⏳ Waiting 1s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final verification
    const finalCount = await prisma.skillBenchmark.count();
    console.log(`\n\n🎉 Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Records processed: ${benchmarks.length}`);
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Initial count: ${currentCount}`);
    console.log(`   - Final count: ${finalCount}`);
    console.log(`   - Net increase: ${finalCount - currentCount}`);
    console.log(`   - Success rate: ${Math.round((successCount / benchmarks.length) * 100)}%`);

    if (errors.length > 0 && errors.length <= 3) {
      console.log(`\n❌ Sample errors:`);
      errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.skillName}: ${error.error.substring(0, 80)}...`);
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
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  executePrismaMigration();
}