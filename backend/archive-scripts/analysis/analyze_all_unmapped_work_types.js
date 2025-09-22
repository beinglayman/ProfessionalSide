const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function analyzeAllUnmappedWorkTypes() {
  try {
    console.log('🔍 COMPREHENSIVE ANALYSIS: ALL WORK TYPES WITHOUT SKILLS');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Identify EVERY work type that lacks skill mappings across ALL focus areas');
    console.log('');

    // Get ALL focus areas with complete hierarchy
    const allFocusAreas = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: {
                  include: { skill: true }
                }
              }
            }
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log(`📋 Found ${allFocusAreas.length} focus areas`);
    console.log('');

    let totalWorkTypes = 0;
    let workTypesWithSkills = 0;
    let workTypesWithoutSkills = 0;
    const unmappedWorkTypes = [];

    console.log('🔍 DETAILED ANALYSIS BY FOCUS AREA:');
    console.log('');

    for (const focusArea of allFocusAreas) {
      console.log(`📊 ${focusArea.label} (${focusArea.id})`);
      
      let focusAreaWorkTypes = 0;
      let focusAreaWithSkills = 0;
      let focusAreaWithoutSkills = 0;

      for (const category of focusArea.workCategories) {
        for (const workType of category.workTypes) {
          totalWorkTypes++;
          focusAreaWorkTypes++;
          
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount > 0) {
            workTypesWithSkills++;
            focusAreaWithSkills++;
          } else {
            workTypesWithoutSkills++;
            focusAreaWithoutSkills++;
            
            unmappedWorkTypes.push({
              focusAreaId: focusArea.id,
              focusAreaLabel: focusArea.label,
              categoryId: category.id,
              categoryLabel: category.label,
              workTypeId: workType.id,
              workTypeLabel: workType.label
            });
            
            console.log(`   ❌ ${category.label} > ${workType.label} (${workType.id})`);
          }
        }
      }
      
      const coverage = focusAreaWorkTypes > 0 ? ((focusAreaWithSkills / focusAreaWorkTypes) * 100).toFixed(1) : 0;
      console.log(`   📈 Coverage: ${focusAreaWithSkills}/${focusAreaWorkTypes} work types (${coverage}%)`);
      
      if (focusAreaWithoutSkills > 0) {
        console.log(`   ⚠️  ${focusAreaWithoutSkills} work types need skills`);
      } else {
        console.log(`   ✅ All work types have skills`);
      }
      console.log('');
    }

    console.log('📊 GLOBAL SUMMARY:');
    console.log(`📋 Total work types: ${totalWorkTypes}`);
    console.log(`✅ Work types WITH skills: ${workTypesWithSkills}`);
    console.log(`❌ Work types WITHOUT skills: ${workTypesWithoutSkills}`);
    console.log(`📈 Overall coverage: ${totalWorkTypes > 0 ? ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (unmappedWorkTypes.length === 0) {
      console.log('🎉 PERFECT! ALL WORK TYPES HAVE SKILLS MAPPED!');
      console.log('✅ Every focus area > category > work type has at least one skill');
      return { needsMapping: false, unmappedWorkTypes: [] };
    }

    console.log(`⚠️  UNMAPPED WORK TYPES FOUND: ${unmappedWorkTypes.length}`);
    console.log('');
    console.log('📋 DETAILED LIST OF WORK TYPES NEEDING SKILLS:');
    
    // Group by focus area for better readability
    const groupedByFocusArea = {};
    unmappedWorkTypes.forEach(wt => {
      if (!groupedByFocusArea[wt.focusAreaLabel]) {
        groupedByFocusArea[wt.focusAreaLabel] = [];
      }
      groupedByFocusArea[wt.focusAreaLabel].push(wt);
    });

    Object.entries(groupedByFocusArea).forEach(([focusAreaLabel, workTypes]) => {
      console.log(`\n🔸 ${focusAreaLabel} Focus Area (${workTypes.length} unmapped):`);
      workTypes.forEach((wt, index) => {
        console.log(`   ${index + 1}. ${wt.categoryLabel} > ${wt.workTypeLabel}`);
        console.log(`      ID: ${wt.workTypeId}`);
      });
    });

    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Create comprehensive skill mapping script');
    console.log('2. Map relevant skills to each unmapped work type');
    console.log('3. Verify 100% coverage across all work types');
    
    return { 
      needsMapping: true, 
      unmappedWorkTypes,
      totalWorkTypes,
      workTypesWithSkills,
      workTypesWithoutSkills
    };

  } catch (error) {
    console.error('❌ Error analyzing unmapped work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute analysis
analyzeAllUnmappedWorkTypes()
  .then(result => {
    if (result.needsMapping) {
      console.log('\n🚨 ACTION REQUIRED: Unmapped work types found');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: All work types properly mapped');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });