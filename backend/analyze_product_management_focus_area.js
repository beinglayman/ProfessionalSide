const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeProductManagementFocusArea() {
  try {
    console.log('🔍 Analyzing Product Management Focus Area Work Types...\n');

    // Find the Product Management focus area
    const productManagementFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Product Management',
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

    if (!productManagementFocusArea) {
      console.log('❌ Product Management focus area not found');
      return;
    }

    console.log(`🎯 PRODUCT MANAGEMENT FOCUS AREA: ${productManagementFocusArea.label}`);
    console.log(`📂 Total Categories: ${productManagementFocusArea.workCategories.length}\n`);

    let totalWorkTypes = 0;
    let workTypesWithEnoughSkills = 0;
    const sampleWorkTypes = [];

    // Analyze each category and work type
    for (const category of productManagementFocusArea.workCategories) {
      console.log(`📌 ${category.label} (${category.workTypes.length} work types):`);
      
      for (const workType of category.workTypes) {
        totalWorkTypes++;
        const skillCount = workType.workTypeSkills.length;
        const hasEnough = skillCount >= 4;
        
        if (hasEnough) {
          workTypesWithEnoughSkills++;
        } else {
          // Collect samples for batch creation
          if (sampleWorkTypes.length < 30) {
            sampleWorkTypes.push({
              categoryLabel: category.label,
              workTypeId: workType.id,
              workTypeLabel: workType.label,
              currentSkillCount: skillCount,
              needed: 4 - skillCount
            });
          }
        }

        const status = hasEnough ? '✅' : '❌';
        console.log(`   ${status} ${workType.label} (ID: ${workType.id}) - ${skillCount} skills`);
      }
      console.log('');
    }

    const coveragePercentage = totalWorkTypes > 0 ? 
      ((workTypesWithEnoughSkills / totalWorkTypes) * 100).toFixed(1) : 0;

    console.log('📊 PRODUCT MANAGEMENT FOCUS AREA SUMMARY:');
    console.log(`   Total work types: ${totalWorkTypes}`);
    console.log(`   ✅ With 4+ skills: ${workTypesWithEnoughSkills}`);
    console.log(`   ❌ With <4 skills: ${totalWorkTypes - workTypesWithEnoughSkills}`);
    console.log(`   📈 Coverage percentage: ${coveragePercentage}%\n`);

    // Show sample work types for batch planning
    console.log('🎯 SAMPLE WORK TYPES FOR BATCH 7 (First 30):');
    console.log('');
    
    sampleWorkTypes.forEach((workType, index) => {
      console.log(`${index + 1}. ${workType.categoryLabel} > ${workType.workTypeLabel}`);
      console.log(`   ID: ${workType.workTypeId}`);
      console.log(`   Needs: ${workType.needed} skills`);
      console.log('');
    });

    console.log('✅ Product Management focus area analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing product management focus area:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeProductManagementFocusArea()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });