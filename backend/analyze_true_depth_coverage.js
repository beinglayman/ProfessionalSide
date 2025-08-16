const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeTrueDepthCoverage() {
  try {
    console.log('🔍 Analyzing TRUE Depth Coverage (Every Category Must Have Skills)...\n');

    const targetFocusAreas = [
      'Design', 'Development', 'Leadership', 'Marketing', 
      'Operations', 'Product Management', 'Sales', 'Strategy'
    ];

    const results = [];

    for (const focusAreaName of targetFocusAreas) {
      console.log(`🎯 Analyzing ${focusAreaName.toUpperCase()} Focus Area:`);
      
      // Find the focus area
      const focusArea = await prisma.focusArea.findFirst({
        where: {
          label: {
            contains: focusAreaName,
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
                }
              }
            }
          }
        }
      });

      if (!focusArea) {
        console.log(`   ❌ Focus area not found: ${focusAreaName}\n`);
        results.push({
          focusArea: focusAreaName,
          found: false,
          hasTrueDepthCoverage: false,
          categoriesWithSkills: 0,
          totalCategories: 0,
          categoriesNeedingAttention: [],
          issue: 'Focus area not found'
        });
        continue;
      }

      let categoriesWithSkills = 0;
      let totalWorkTypes = 0;
      let workTypesWithSkills = 0;
      const categoryDetails = [];
      const categoriesNeedingAttention = [];

      for (const category of focusArea.workCategories) {
        let categoryHasSkills = false;
        let categoryWorkTypesWithSkills = 0;

        for (const workType of category.workTypes) {
          totalWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount > 0) {
            workTypesWithSkills++;
            categoryWorkTypesWithSkills++;
            categoryHasSkills = true;
          }
        }

        if (categoryHasSkills) {
          categoriesWithSkills++;
        } else {
          categoriesNeedingAttention.push({
            name: category.label,
            workTypes: category.workTypes.map(wt => ({
              id: wt.id,
              label: wt.label
            }))
          });
        }

        categoryDetails.push({
          name: category.label,
          totalWorkTypes: category.workTypes.length,
          workTypesWithSkills: categoryWorkTypesWithSkills,
          hasSkills: categoryHasSkills
        });
      }

      // TRUE depth coverage means ALL categories have skills
      const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
      
      const coveragePercentage = totalWorkTypes > 0 ? 
        ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

      console.log(`   📊 Total Categories: ${focusArea.workCategories.length}`);
      console.log(`   📊 Categories with skills: ${categoriesWithSkills}`);
      console.log(`   📊 Categories WITHOUT skills: ${focusArea.workCategories.length - categoriesWithSkills}`);
      console.log(`   📊 Total Work Types: ${totalWorkTypes}`);
      console.log(`   📊 Work Types with skills: ${workTypesWithSkills}`);
      console.log(`   📊 Coverage: ${coveragePercentage}%`);
      console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} TRUE Depth Coverage: ${hasTrueDepthCoverage ? 'YES' : 'NO'}`);

      // Show category breakdown
      console.log(`   📋 Category Breakdown:`);
      categoryDetails.forEach(cat => {
        const status = cat.hasSkills ? '✅' : '❌';
        console.log(`      ${status} ${cat.name}: ${cat.workTypesWithSkills}/${cat.totalWorkTypes} work types with skills`);
      });

      // Show categories needing attention
      if (categoriesNeedingAttention.length > 0) {
        console.log(`   🚨 Categories NEEDING ATTENTION (${categoriesNeedingAttention.length}):`);
        categoriesNeedingAttention.forEach(cat => {
          console.log(`      • ${cat.name} (${cat.workTypes.length} work types, 0 with skills)`);
          // Show first work type as example
          if (cat.workTypes.length > 0) {
            console.log(`        Example work type: ${cat.workTypes[0].label} (ID: ${cat.workTypes[0].id})`);
          }
        });
      }

      console.log('');

      results.push({
        focusArea: focusAreaName,
        found: true,
        hasTrueDepthCoverage,
        categoriesWithSkills,
        totalCategories: focusArea.workCategories.length,
        categoriesNeedingAttention,
        workTypesWithSkills,
        totalWorkTypes,
        coveragePercentage: parseFloat(coveragePercentage),
        categoryDetails
      });
    }

    // Summary
    console.log('📈 TRUE DEPTH COVERAGE SUMMARY:');
    console.log('');
    
    const withTrueDepthCoverage = results.filter(r => r.hasTrueDepthCoverage);
    const withoutTrueDepthCoverage = results.filter(r => r.found && !r.hasTrueDepthCoverage);
    const notFound = results.filter(r => !r.found);

    console.log(`✅ Focus Areas WITH True Depth Coverage (${withTrueDepthCoverage.length}):`);
    if (withTrueDepthCoverage.length === 0) {
      console.log('   None - all focus areas need attention!');
    } else {
      withTrueDepthCoverage.forEach(result => {
        console.log(`   • ${result.focusArea}: ${result.categoriesWithSkills}/${result.totalCategories} categories, ${result.coveragePercentage}% coverage`);
      });
    }

    console.log('');
    console.log(`❌ Focus Areas WITHOUT True Depth Coverage (${withoutTrueDepthCoverage.length}):`);
    withoutTrueDepthCoverage.forEach(result => {
      const gapCount = result.totalCategories - result.categoriesWithSkills;
      console.log(`   • ${result.focusArea}: ${result.categoriesWithSkills}/${result.totalCategories} categories (${gapCount} categories need skills)`);
    });

    if (notFound.length > 0) {
      console.log('');
      console.log(`⚠️  Focus Areas NOT FOUND (${notFound.length}):`);
      notFound.forEach(result => {
        console.log(`   • ${result.focusArea}`);
      });
    }

    console.log('');
    console.log('🎯 DETAILED ACTION PLAN:');
    console.log('');
    
    withoutTrueDepthCoverage.forEach(result => {
      if (result.categoriesNeedingAttention.length > 0) {
        console.log(`📋 ${result.focusArea.toUpperCase()} - Categories needing skills:`);
        result.categoriesNeedingAttention.forEach(cat => {
          console.log(`   • ${cat.name}:`);
          console.log(`     - ${cat.workTypes.length} work types available`);
          console.log(`     - Suggestion: Add skills to "${cat.workTypes[0]?.label}" (ID: ${cat.workTypes[0]?.id})`);
        });
        console.log('');
      }
    });

    console.log('✅ True depth coverage analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing true depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeTrueDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });