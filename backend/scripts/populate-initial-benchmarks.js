/**
 * Populate initial skill benchmarks for common tech skills
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Top 15 technology skills with realistic benchmarks
const INITIAL_BENCHMARKS = [
  {
    skillName: 'JavaScript',
    industryAverage: 70,
    juniorLevel: 40,
    midLevel: 60,
    seniorLevel: 80,
    expertLevel: 95,
    marketDemand: 'very-high',
    growthTrend: 'stable',
    description: 'Essential frontend and backend programming language with high market demand across all experience levels.'
  },
  {
    skillName: 'TypeScript',
    industryAverage: 65,
    juniorLevel: 35,
    midLevel: 55,
    seniorLevel: 75,
    expertLevel: 90,
    marketDemand: 'very-high',
    growthTrend: 'hot',
    description: 'Rapidly growing typed superset of JavaScript, increasingly required for enterprise development.'
  },
  {
    skillName: 'React',
    industryAverage: 68,
    juniorLevel: 38,
    midLevel: 58,
    seniorLevel: 78,
    expertLevel: 92,
    marketDemand: 'very-high',
    growthTrend: 'growing',
    description: 'Leading frontend framework with strong market demand and continuous ecosystem growth.'
  },
  {
    skillName: 'Node.js',
    industryAverage: 66,
    juniorLevel: 36,
    midLevel: 56,
    seniorLevel: 76,
    expertLevel: 90,
    marketDemand: 'high',
    growthTrend: 'stable',
    description: 'Server-side JavaScript runtime essential for full-stack development with consistent market demand.'
  },
  {
    skillName: 'Python',
    industryAverage: 72,
    juniorLevel: 42,
    midLevel: 62,
    seniorLevel: 82,
    expertLevel: 95,
    marketDemand: 'very-high',
    growthTrend: 'hot',
    description: 'Versatile language dominating data science, AI/ML, and web development with explosive growth.'
  },
  {
    skillName: 'AWS',
    industryAverage: 64,
    juniorLevel: 34,
    midLevel: 54,
    seniorLevel: 74,
    expertLevel: 88,
    marketDemand: 'very-high',
    growthTrend: 'growing',
    description: 'Leading cloud platform with critical importance for modern infrastructure and DevOps.'
  },
  {
    skillName: 'Docker',
    industryAverage: 62,
    juniorLevel: 32,
    midLevel: 52,
    seniorLevel: 72,
    expertLevel: 85,
    marketDemand: 'high',
    growthTrend: 'growing',
    description: 'Container technology essential for modern deployment and development workflows.'
  },
  {
    skillName: 'Kubernetes',
    industryAverage: 58,
    juniorLevel: 28,
    midLevel: 48,
    seniorLevel: 68,
    expertLevel: 82,
    marketDemand: 'high',
    growthTrend: 'hot',
    description: 'Container orchestration platform with high complexity but critical for enterprise scalability.'
  },
  {
    skillName: 'PostgreSQL',
    industryAverage: 61,
    juniorLevel: 31,
    midLevel: 51,
    seniorLevel: 71,
    expertLevel: 85,
    marketDemand: 'high',
    growthTrend: 'stable',
    description: 'Advanced open-source relational database preferred for complex applications and data integrity.'
  },
  {
    skillName: 'GraphQL',
    industryAverage: 56,
    juniorLevel: 26,
    midLevel: 46,
    seniorLevel: 66,
    expertLevel: 80,
    marketDemand: 'medium',
    growthTrend: 'growing',
    description: 'API query language gaining adoption for flexible data fetching in modern applications.'
  },
  {
    skillName: 'Next.js',
    industryAverage: 59,
    juniorLevel: 29,
    midLevel: 49,
    seniorLevel: 69,
    expertLevel: 83,
    marketDemand: 'high',
    growthTrend: 'hot',
    description: 'React framework with server-side rendering, rapidly growing for production web applications.'
  },
  {
    skillName: 'Tailwind CSS',
    industryAverage: 54,
    juniorLevel: 24,
    midLevel: 44,
    seniorLevel: 64,
    expertLevel: 78,
    marketDemand: 'high',
    growthTrend: 'hot',
    description: 'Utility-first CSS framework experiencing explosive adoption for rapid UI development.'
  },
  {
    skillName: 'MongoDB',
    industryAverage: 60,
    juniorLevel: 30,
    midLevel: 50,
    seniorLevel: 70,
    expertLevel: 84,
    marketDemand: 'medium',
    growthTrend: 'stable',
    description: 'NoSQL document database popular for flexible schema and rapid prototyping needs.'
  },
  {
    skillName: 'Redis',
    industryAverage: 57,
    juniorLevel: 27,
    midLevel: 47,
    seniorLevel: 67,
    expertLevel: 81,
    marketDemand: 'medium',
    growthTrend: 'stable',
    description: 'In-memory data structure store used for caching, session management, and real-time applications.'
  },
  {
    skillName: 'DevOps',
    industryAverage: 63,
    juniorLevel: 33,
    midLevel: 53,
    seniorLevel: 73,
    expertLevel: 87,
    marketDemand: 'very-high',
    growthTrend: 'growing',
    description: 'Culture and practices bridging development and operations, critical for modern software delivery.'
  }
];

async function populateInitialBenchmarks() {
  console.log('🎯 Populating initial skill benchmarks...');
  
  try {
    let created = 0;
    let updated = 0;
    
    for (const benchmark of INITIAL_BENCHMARKS) {
      const result = await prisma.skillBenchmark.upsert({
        where: {
          skillName_industry: {
            skillName: benchmark.skillName,
            industry: 'general'
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
          industry: 'general',
          role: 'general',
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
      
      // Check if it was a create or update operation
      const existing = await prisma.skillBenchmark.findFirst({
        where: {
          skillName: benchmark.skillName,
          industry: 'general',
          createdAt: { lt: new Date(Date.now() - 1000) } // Check if created more than 1 second ago
        }
      });
      
      if (existing) {
        updated++;
      } else {
        created++;
      }
      
      console.log(`  ✅ ${benchmark.skillName}: ${benchmark.marketDemand} demand, ${benchmark.growthTrend} trend`);
    }
    
    console.log(`\n✅ Successfully populated skill benchmarks:`);
    console.log(`   📊 ${created} new benchmarks created`);
    console.log(`   🔄 ${updated} existing benchmarks updated`);
    console.log(`   🎯 ${INITIAL_BENCHMARKS.length} total skills processed`);
    
    // Show some statistics
    const stats = await prisma.skillBenchmark.groupBy({
      by: ['marketDemand'],
      _count: true,
      where: { industry: 'general' }
    });
    
    console.log('\n📈 Market demand distribution:');
    stats.forEach(stat => {
      console.log(`   ${stat.marketDemand}: ${stat._count} skills`);
    });
    
  } catch (error) {
    console.error('❌ Error populating skill benchmarks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  populateInitialBenchmarks()
    .then(() => {
      console.log('\n🎉 Initial skill benchmarks population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to populate skill benchmarks:', error);
      process.exit(1);
    });
}

module.exports = { populateInitialBenchmarks, INITIAL_BENCHMARKS };