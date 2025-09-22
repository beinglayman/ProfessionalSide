const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function verifyDeploymentStatus() {
  try {
    console.log('🔍 DEPLOYMENT VERIFICATION - Checking Database Status...\n');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL);
    console.log('');

    // Quick database stats
    const [skillCount, workTypeCount, mappingCount, focusAreaCount] = await Promise.all([
      prisma.skill.count(),
      prisma.workType.count(),
      prisma.workTypeSkill.count(),
      prisma.focusArea.count()
    ]);

    console.log('📊 DATABASE STATISTICS:');
    console.log(`   Focus Areas: ${focusAreaCount}`);
    console.log(`   Work Types: ${workTypeCount}`);
    console.log(`   Skills: ${skillCount}`);
    console.log(`   Skill Mappings: ${mappingCount}`);
    console.log(`   Average Skills per Work Type: ${workTypeCount > 0 ? (mappingCount / workTypeCount).toFixed(2) : 0}`);
    console.log('');

    // Check Supply Chain specifically
    console.log('🔍 SUPPLY CHAIN STATUS:');
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: 'operations-supply-chain'
      },
      include: {
        workTypeSkills: {
          include: { skill: true }
        }
      }
    });

    console.log(`   Found ${supplyChainWorkTypes.length} Supply Chain work types`);
    
    if (supplyChainWorkTypes.length > 0) {
      supplyChainWorkTypes.forEach(wt => {
        console.log(`   • ${wt.label}: ${wt.workTypeSkills.length} skills`);
      });
    } else {
      console.log('   ❌ No Supply Chain work types found');
    }
    console.log('');

    // Check recent activity
    console.log('🕐 RECENT ACTIVITY (Last 24 hours):');
    const recentSkills = await prisma.skill.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    const recentMappings = await prisma.workTypeSkill.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    console.log(`   Skills created: ${recentSkills}`);
    console.log(`   Mappings created: ${recentMappings}`);
    console.log('');

    // Assessment
    console.log('🎯 DEPLOYMENT ASSESSMENT:');
    
    const expectedMinSkills = 400; // We should have 400+ skills after our scripts
    const expectedMinMappings = 200; // We should have 200+ mappings
    
    if (skillCount >= expectedMinSkills) {
      console.log('   ✅ SKILLS: Sufficient count - scripts likely executed');
    } else {
      console.log(`   ❌ SKILLS: Low count (${skillCount}/${expectedMinSkills}) - scripts may not have executed`);
    }

    if (mappingCount >= expectedMinMappings) {
      console.log('   ✅ MAPPINGS: Sufficient count - scripts likely executed');
    } else {
      console.log(`   ❌ MAPPINGS: Low count (${mappingCount}/${expectedMinMappings}) - scripts may not have executed`);
    }

    if (supplyChainWorkTypes.length > 0 && supplyChainWorkTypes.some(wt => wt.workTypeSkills.length > 0)) {
      console.log('   ✅ SUPPLY CHAIN: Has work types with skills');
    } else {
      console.log('   ❌ SUPPLY CHAIN: Missing work types or skills');
    }

    if (recentMappings > 20) {
      console.log('   ✅ RECENT ACTIVITY: High activity detected - scripts likely ran recently');
    } else {
      console.log('   ❌ RECENT ACTIVITY: Low activity - scripts may not have executed');
    }

    console.log('');
    console.log('🏁 VERIFICATION COMPLETED');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute verification
verifyDeploymentStatus()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });