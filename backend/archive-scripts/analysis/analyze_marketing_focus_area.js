const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeMarketingFocusArea() {
  try {
    console.log('🔍 Analyzing Marketing Focus Area Work Types and Skill Coverage...\n');

    // Find the Marketing focus area
    const marketingFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Marketing',
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

    if (!marketingFocusArea) {
      console.log('❌ Marketing focus area not found');
      return;
    }

    console.log(`🎯 MARKETING FOCUS AREA: ${marketingFocusArea.label}`);
    console.log(`📂 Total Categories: ${marketingFocusArea.workCategories.length}\n`);

    let totalWorkTypes = 0;
    let workTypesWithEnoughSkills = 0;
    const workTypesNeedingSkills = [];

    // Analyze each category and work type
    for (const category of marketingFocusArea.workCategories) {
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

    console.log('📊 MARKETING FOCUS AREA SUMMARY:');
    console.log(`   Total work types: ${totalWorkTypes}`);
    console.log(`   ✅ With 4+ skills: ${workTypesWithEnoughSkills}`);
    console.log(`   ❌ With <4 skills: ${workTypesNeedingSkills.length}`);
    console.log(`   📈 Coverage percentage: ${coveragePercentage}%\n`);

    // Show sample work types that need skills (first 20 for readability)
    if (workTypesNeedingSkills.length > 0) {
      console.log('🎯 SAMPLE WORK TYPES NEEDING SKILLS (First 20):');
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

      console.log(`... and ${workTypesNeedingSkills.length - 20} more work types needing skills.\n`);

      // Generate a sample mapping template for batch creation
      console.log('💡 SAMPLE SKILL MAPPINGS FOR BATCH 6:');
      console.log('');
      console.log('const skillMappings = [');
      
      const sampleMappings = workTypesNeedingSkills.slice(0, 20);
      for (const workType of sampleMappings) {
        console.log(`  {`);
        console.log(`    workTypeId: '${workType.workTypeId}',`);
        console.log(`    skillNames: [/* Add ${workType.needed} relevant skills for ${workType.workTypeLabel} */]`);
        console.log(`  },`);
      }
      console.log('];');
      console.log('');
    }

    console.log('✅ Marketing focus area analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing marketing focus area:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeMarketingFocusArea()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });