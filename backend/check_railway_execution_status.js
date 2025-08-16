const { PrismaClient } = require('@prisma/client');

// Use Railway database URL directly
const RAILWAY_DATABASE_URL = "postgresql://postgres:BpLgUQOXZNuKOvBGPelRLOWdcNJvRgOT@postgres.railway.internal:5432/railway";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: RAILWAY_DATABASE_URL
    }
  }
});

async function checkRailwayExecutionStatus() {
  try {
    console.log('🔍 CHECKING RAILWAY DATABASE EXECUTION STATUS...\n');

    // Check 1: Supply Chain Management work types and their skills
    console.log('1. SUPPLY CHAIN MANAGEMENT WORK TYPES:');
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        id: {
          startsWith: 'operations-scm-'
        }
      },
      include: {
        workTypeSkills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    if (supplyChainWorkTypes.length === 0) {
      console.log('   ❌ No Supply Chain work types found');
    } else {
      console.log(`   ✅ Found ${supplyChainWorkTypes.length} Supply Chain work types:`);
      supplyChainWorkTypes.forEach(workType => {
        const skillCount = workType.workTypeSkills.length;
        const skills = workType.workTypeSkills.map(wts => wts.skill.name).slice(0, 3).join(', ');
        const hasSkills = skillCount > 0 ? '✅' : '❌';
        console.log(`   ${hasSkills} ${workType.label}: ${skillCount} skills${skillCount > 0 ? ` (${skills}${skillCount > 3 ? '...' : ''})` : ''}`);
      });
    }
    console.log('');

    // Check 2: Depth coverage for 8 primary focus areas
    console.log('2. DEPTH COVERAGE FOR 8 PRIMARY FOCUS AREAS:');
    const targetFocusAreas = [
      'Design', 'Development', 'Leadership', 'Marketing', 
      'Operations', 'Product Management', 'Sales', 'Strategy'
    ];

    let totalComplete = 0;
    let totalIncomplete = 0;

    for (const focusAreaName of targetFocusAreas) {
      const focusArea = await prisma.focusArea.findFirst({
        where: { 
          label: { contains: focusAreaName, mode: 'insensitive' }
        },
        include: {
          workCategories: {
            include: {
              workTypes: {
                include: { workTypeSkills: true }
              }
            }
          }
        }
      });

      if (!focusArea) {
        console.log(`   ❌ ${focusAreaName}: Focus area not found`);
        continue;
      }

      let categoriesWithSkills = 0;
      let totalWorkTypes = 0;
      let workTypesWithSkills = 0;

      focusArea.workCategories.forEach(category => {
        let categoryHasSkills = false;
        category.workTypes.forEach(workType => {
          totalWorkTypes++;
          if (workType.workTypeSkills.length > 0) {
            workTypesWithSkills++;
            categoryHasSkills = true;
          }
        });
        if (categoryHasSkills) {
          categoriesWithSkills++;
        }
      });

      const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
      const coverage = totalWorkTypes > 0 ? 
        ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

      if (hasTrueDepthCoverage) {
        totalComplete++;
        console.log(`   ✅ ${focusAreaName}: COMPLETE (${categoriesWithSkills}/${focusArea.workCategories.length} categories, ${coverage}% coverage)`);
      } else {
        totalIncomplete++;
        console.log(`   ❌ ${focusAreaName}: INCOMPLETE (${categoriesWithSkills}/${focusArea.workCategories.length} categories, ${coverage}% coverage)`);
      }
    }

    console.log(`\n   📊 SUMMARY: ${totalComplete}/8 focus areas have complete depth coverage`);
    console.log('');

    // Check 3: Recent skill creation activity
    console.log('3. RECENT SKILL CREATION ACTIVITY:');
    const recentSkills = await prisma.skill.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentSkills.length === 0) {
      console.log('   ❌ No skills created in the last 24 hours');
    } else {
      console.log(`   ✅ ${recentSkills.length} skills created in the last 24 hours:`);
      recentSkills.forEach(skill => {
        console.log(`   • ${skill.name} (${skill.createdAt.toISOString()})`);
      });
    }
    console.log('');

    // Check 4: Recent work type skill mappings
    console.log('4. RECENT WORK TYPE SKILL MAPPINGS:');
    const recentMappings = await prisma.workTypeSkill.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        workType: true,
        skill: true
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    if (recentMappings.length === 0) {
      console.log('   ❌ No work type skill mappings created in the last 24 hours');
    } else {
      console.log(`   ✅ ${recentMappings.length} work type skill mappings created in the last 24 hours:`);
      recentMappings.forEach(mapping => {
        console.log(`   • ${mapping.workType.label} → ${mapping.skill.name}`);
      });
    }
    console.log('');

    // Check 5: Total database stats
    console.log('5. DATABASE STATISTICS:');
    const [skillCount, workTypeCount, mappingCount] = await Promise.all([
      prisma.skill.count(),
      prisma.workType.count(),
      prisma.workTypeSkill.count()
    ]);

    console.log(`   📊 Total Skills: ${skillCount}`);
    console.log(`   📊 Total Work Types: ${workTypeCount}`);
    console.log(`   📊 Total Skill Mappings: ${mappingCount}`);
    console.log(`   📊 Average Skills per Work Type: ${workTypeCount > 0 ? (mappingCount / workTypeCount).toFixed(2) : 0}`);
    console.log('');

    // Final assessment
    console.log('🎯 EXECUTION STATUS ASSESSMENT:');
    const supplyChainFixed = supplyChainWorkTypes.filter(wt => wt.workTypeSkills.length > 0).length;
    const supplyChainTotal = supplyChainWorkTypes.length;
    
    if (supplyChainFixed === supplyChainTotal && supplyChainTotal > 0) {
      console.log('   ✅ Supply Chain fix script: EXECUTED');
    } else {
      console.log(`   ❌ Supply Chain fix script: NOT EXECUTED (${supplyChainFixed}/${supplyChainTotal} work types have skills)`);
    }

    if (totalComplete >= 6) { // Most focus areas should be complete
      console.log('   ✅ Depth coverage script: LIKELY EXECUTED');
    } else {
      console.log(`   ❌ Depth coverage script: NOT EXECUTED (only ${totalComplete}/8 focus areas complete)`);
    }

    if (recentMappings.length > 20) {
      console.log('   ✅ Recent database activity: HIGH (scripts likely ran recently)');
    } else if (recentMappings.length > 0) {
      console.log('   ⚠️  Recent database activity: LOW (some activity detected)');
    } else {
      console.log('   ❌ Recent database activity: NONE (scripts likely did not run)');
    }

  } catch (error) {
    console.error('❌ Error checking Railway execution status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
checkRailwayExecutionStatus()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });