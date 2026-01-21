import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

const router = Router();

// Admin migration endpoint - execute benchmark data migration
router.post('/execute-benchmark-migration', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🚀 Starting benchmark migration via API endpoint...\n');

    // Read the JSON export data
    const exportFile = path.join(__dirname, '../../skill-benchmarks-export.json');
    
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      return res.status(404).json({
        success: false,
        message: 'Export file not found. Please ensure skill-benchmarks-export.json exists.'
      });
    }

    const benchmarks = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    console.log(`📊 Loaded ${benchmarks.length} benchmarks from export file`);

    // Check current production state
    const existingCount = await prisma.skillBenchmark.count();
    console.log(`📈 Current production benchmarks: ${existingCount}`);

    // Send immediate response to client
    res.status(202).json({
      success: true,
      message: `Started benchmark migration for ${benchmarks.length} records`,
      currentCount: existingCount,
      totalToMigrate: benchmarks.length,
      estimatedDuration: '2-3 minutes'
    });

    // Continue processing in background
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    console.log(`📦 Processing ${Math.ceil(benchmarks.length / batchSize)} batches...`);

    for (let i = 0; i < benchmarks.length; i += batchSize) {
      const batch = benchmarks.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(benchmarks.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);

      // Use transaction for batch integrity
      try {
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
            } catch (error: any) {
              errorCount++;
              errors.push({
                skillName: benchmark.skillName,
                error: (error as any).message
              });
              process.stdout.write('❌');
            }
          }
        });
      } catch (batchError: any) {
        console.log(`\n❌ Batch ${batchNum} failed:`, batchError.message);
        errorCount += batch.length;
      }

      // Small delay between batches
      if (i + batchSize < benchmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Final verification
    const finalCount = await prisma.skillBenchmark.count();

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Records processed: ${benchmarks.length}`);
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Initial count: ${existingCount}`);
    console.log(`   - Final count: ${finalCount}`);
    console.log(`   - Net increase: ${finalCount - existingCount}`);
    console.log(`   - Success rate: ${Math.round((successCount / benchmarks.length) * 100)}%`);

  } catch (error: any) {
    console.error('💥 Critical migration error:', error);
    
    // Try to send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Migration failed',
        error: (error as any).message
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

// Check migration status endpoint
router.get('/benchmark-status', async (req: Request, res: Response) => {
  try {
    const totalBenchmarks = await prisma.skillBenchmark.count();
    const sampleBenchmarks = await prisma.skillBenchmark.findMany({
      take: 5,
      select: {
        skillName: true,
        industryAverage: true,
        marketDemand: true,
        growthTrend: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      totalBenchmarks,
      sampleBenchmarks,
      lastUpdated: sampleBenchmarks[0]?.createdAt || null
    });
  } catch (error: any) {
    console.error('Error checking benchmark status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check benchmark status',
      error: (error as any).message
    });
  }
});

export default router;