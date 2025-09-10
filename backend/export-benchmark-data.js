const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportBenchmarkData() {
  try {
    console.log('🔍 Exporting benchmark data from local database...\n');

    // Get all benchmark records
    const benchmarks = await prisma.skillBenchmark.findMany({
      orderBy: { skillName: 'asc' }
    });

    console.log(`✅ Found ${benchmarks.length} benchmark records`);

    if (benchmarks.length === 0) {
      console.log('❌ No benchmark data to export');
      return;
    }

    // Generate SQL INSERT statements
    let sqlContent = `-- SkillBenchmark data export
-- Generated on: ${new Date().toISOString()}
-- Total records: ${benchmarks.length}

`;

    // Add INSERT statements
    const values = benchmarks.map(benchmark => {
      const createdAt = benchmark.createdAt ? `'${benchmark.createdAt.toISOString()}'` : 'NOW()';
      const updatedAt = benchmark.updatedAt ? `'${benchmark.updatedAt.toISOString()}'` : 'NOW()';
      const description = benchmark.description ? `'${benchmark.description.replace(/'/g, "''")}'` : 'NULL';
      
      return `  ('${benchmark.id}', '${benchmark.skillName}', '${benchmark.industry}', '${benchmark.role}', ${benchmark.industryAverage}, ${benchmark.juniorLevel}, ${benchmark.midLevel}, ${benchmark.seniorLevel}, ${benchmark.expertLevel}, '${benchmark.marketDemand}', '${benchmark.growthTrend}', ${description}, ${createdAt}, ${updatedAt})`;
    }).join(',\n');

    sqlContent += `INSERT INTO "SkillBenchmark" (id, "skillName", industry, role, "industryAverage", "juniorLevel", "midLevel", "seniorLevel", "expertLevel", "marketDemand", "growthTrend", description, "createdAt", "updatedAt") VALUES\n`;
    sqlContent += values + ';\n\n';

    // Add some statistics
    sqlContent += `-- Export Statistics:
-- Total benchmarks: ${benchmarks.length}
-- Skill categories covered: General industry benchmarks
-- Market demand levels: ${[...new Set(benchmarks.map(b => b.marketDemand))].join(', ')}
-- Growth trends: ${[...new Set(benchmarks.map(b => b.growthTrend))].join(', ')}
`;

    // Write to file
    const exportFile = 'skill-benchmarks-export.sql';
    fs.writeFileSync(exportFile, sqlContent);

    console.log(`\n📄 Exported ${benchmarks.length} benchmarks to: ${exportFile}`);
    console.log(`📊 File size: ${(fs.statSync(exportFile).size / 1024).toFixed(2)} KB`);
    
    // Also create a JSON export for backup
    const jsonFile = 'skill-benchmarks-export.json';
    fs.writeFileSync(jsonFile, JSON.stringify(benchmarks, null, 2));
    
    console.log(`💾 JSON backup created: ${jsonFile}`);
    console.log(`📊 JSON size: ${(fs.statSync(jsonFile).size / 1024).toFixed(2)} KB`);

    // Sample of exported data
    console.log('\n🔍 Sample exported records:');
    benchmarks.slice(0, 3).forEach((benchmark, index) => {
      console.log(`  ${index + 1}. ${benchmark.skillName}: ${benchmark.industryAverage}/100 (${benchmark.marketDemand} demand, ${benchmark.growthTrend} trend)`);
    });
    
    console.log(`  ... and ${benchmarks.length - 3} more records`);
    
  } catch (error) {
    console.error('❌ Error exporting benchmark data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportBenchmarkData();