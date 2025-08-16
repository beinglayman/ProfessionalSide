const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeDesignFocusArea() {
  try {
    console.log('🔍 Analyzing Design Focus Area Work Types and Skill Coverage...\n');

    // Find the Design focus area
    const designFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Design',
          mode: 'insensitive'
        }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: {
                  include: {
                    skill: true
                  }
                }
              },
              orderBy: { label: 'asc' }
            }
          },
          orderBy: { label: 'asc' }
        }
      }
    });

    if (!designFocusArea) {
      console.log('❌ Design focus area not found');
      return;
    }

    console.log(`🎯 DESIGN FOCUS AREA: ${designFocusArea.label}`);
    console.log(`📂 Total Categories: ${designFocusArea.workCategories.length}\n`);

    let totalWorkTypes = 0;
    let workTypesWithEnoughSkills = 0;
    const workTypesNeedingSkills = [];

    // Analyze each category and work type
    for (const category of designFocusArea.workCategories) {
      console.log(`📌 ${category.label} (${category.workTypes.length} work types):`);
      
      for (const workType of category.workTypes) {
        totalWorkTypes++;
        const skillCount = workType.workTypeSkills.length;
        const hasEnough = skillCount >= 4;
        
        if (hasEnough) {
          workTypesWithEnoughSkills++;
        } else {
          workTypesNeedingSkills.push({
            categoryLabel: category.label,
            workTypeId: workType.id,
            workTypeLabel: workType.label,
            currentSkillCount: skillCount,
            needed: 4 - skillCount,
            currentSkills: workType.workTypeSkills.map(wts => wts.skill.name)
          });
        }

        const status = hasEnough ? '✅' : '❌';
        const statusText = hasEnough ? 'SUFFICIENT' : 'NEEDS MORE';
        
        console.log(`   ${status} ${workType.label} (ID: ${workType.id})`);
        console.log(`      Skills: ${skillCount} (${statusText})`);
        
        if (skillCount > 0) {
          console.log(`      Current skills: ${workType.workTypeSkills.map(wts => wts.skill.name).join(', ')}`);
        }
        console.log('');
      }
    }

    const coveragePercentage = totalWorkTypes > 0 ? 
      ((workTypesWithEnoughSkills / totalWorkTypes) * 100).toFixed(1) : 0;

    console.log('📊 DESIGN FOCUS AREA SUMMARY:');
    console.log(`   Total work types: ${totalWorkTypes}`);
    console.log(`   ✅ With 4+ skills: ${workTypesWithEnoughSkills}`);
    console.log(`   ❌ With <4 skills: ${workTypesNeedingSkills.length}`);
    console.log(`   📈 Coverage percentage: ${coveragePercentage}%\n`);

    // Show work types that need skills (up to 20 for readability)
    if (workTypesNeedingSkills.length > 0) {
      console.log('🎯 WORK TYPES NEEDING MORE SKILLS (Sample of first 20):');
      console.log('');
      
      const sampleWorkTypes = workTypesNeedingSkills.slice(0, 20);
      
      for (const workType of sampleWorkTypes) {
        console.log(`📌 ${workType.categoryLabel} > ${workType.workTypeLabel}`);
        console.log(`   ID: ${workType.workTypeId}`);
        console.log(`   Current skills: ${workType.currentSkillCount}`);
        console.log(`   Needs: ${workType.needed} more skills`);
        if (workType.currentSkills.length > 0) {
          console.log(`   Current: ${workType.currentSkills.join(', ')}`);
        }
        console.log('');
      }

      if (workTypesNeedingSkills.length > 20) {
        console.log(`... and ${workTypesNeedingSkills.length - 20} more work types needing skills.\n`);
      }

      // Generate a sample mapping template for the first few work types
      console.log('💡 SAMPLE SKILL MAPPINGS FOR NEXT BATCH:');
      console.log('');
      console.log('const skillMappings = [');
      
      const sampleMappings = workTypesNeedingSkills.slice(0, 10);
      for (const workType of sampleMappings) {
        console.log(`  {`);
        console.log(`    workTypeId: '${workType.workTypeId}',`);
        console.log(`    skillNames: [/* Add ${workType.needed} relevant skills for ${workType.workTypeLabel} */]`);
        console.log(`  },`);
      }
      console.log('];');
      console.log('');
    }

    console.log('✅ Design focus area analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing design focus area:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeDesignFocusArea()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });