/**
 * Analyze skills in the database and check benchmark coverage
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeSkills() {
  console.log('🔍 Analyzing skills in the database...\n');
  
  try {
    // Get total count of skills
    const totalSkills = await prisma.skill.count();
    console.log(`📊 Total skills in database: ${totalSkills}`);
    
    // Get skills by category
    const skillsByCategory = await prisma.skill.groupBy({
      by: ['category'],
      _count: true,
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });
    
    console.log('\n📋 Skills by category:');
    skillsByCategory.forEach(group => {
      console.log(`   ${group.category || 'Uncategorized'}: ${group._count} skills`);
    });
    
    // Get existing benchmarks count
    const totalBenchmarks = await prisma.skillBenchmark.count();
    console.log(`\n🎯 Existing benchmarks: ${totalBenchmarks}`);
    
    // Find skills without benchmarks
    const skillsWithoutBenchmarks = await prisma.skill.findMany({
      where: {
        name: {
          notIn: (await prisma.skillBenchmark.findMany({
            where: { industry: 'general' },
            select: { skillName: true }
          })).map(b => b.skillName)
        }
      },
      orderBy: { name: 'asc' },
      take: 20 // Show first 20 for preview
    });
    
    console.log(`\n❌ Skills without benchmarks: ${skillsWithoutBenchmarks.length > 20 ? '20+' : skillsWithoutBenchmarks.length} (showing first 20)`);
    skillsWithoutBenchmarks.forEach(skill => {
      console.log(`   - ${skill.name} (${skill.category || 'Uncategorized'})`);
    });
    
    // Get all skills for benchmarking (limited sample)
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' },
      take: 50 // Get first 50 for analysis
    });
    
    console.log(`\n📝 Sample of all skills (first 50 of ${totalSkills}):`);
    allSkills.forEach(skill => {
      console.log(`   - ${skill.name} (${skill.category || 'Uncategorized'})`);
    });
    
    // Check if we have skills used by users
    const skillsInUse = await prisma.userSkill.groupBy({
      by: ['skillId'],
      _count: true,
      orderBy: {
        _count: {
          skillId: 'desc'
        }
      },
      take: 10
    });
    
    if (skillsInUse.length > 0) {
      console.log(`\n🔥 Most popular skills (top 10 by user count):`);
      for (const userSkill of skillsInUse) {
        const skill = await prisma.skill.findUnique({
          where: { id: userSkill.skillId }
        });
        console.log(`   - ${skill?.name || 'Unknown'}: ${userSkill._count} users`);
      }
    }
    
    return {
      totalSkills,
      totalBenchmarks,
      skillsWithoutBenchmarks: skillsWithoutBenchmarks.length,
      skillsByCategory: skillsByCategory,
      allSkillNames: allSkills.map(s => s.name)
    };
    
  } catch (error) {
    console.error('❌ Error analyzing skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  analyzeSkills()
    .then((results) => {
      console.log(`\n✅ Analysis completed!`);
      console.log(`   📊 ${results.totalSkills} total skills`);
      console.log(`   🎯 ${results.totalBenchmarks} existing benchmarks`);
      console.log(`   ❌ ${results.skillsWithoutBenchmarks} skills need benchmarks`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to analyze skills:', error);
      process.exit(1);
    });
}

module.exports = { analyzeSkills };