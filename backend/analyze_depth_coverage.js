const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeDepthCoverage() {
  try {
    console.log('🔍 Analyzing Depth Coverage Across Target Focus Areas...\n');

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
          hasDepthCoverage: false,
          categoriesWithSkills: 0,
          totalCategories: 0,
          issue: 'Focus area not found'
        });
        continue;
      }

      let categoriesWithSkills = 0;
      let totalWorkTypes = 0;
      let workTypesWithSkills = 0;
      let hasDepthCoverage = false;
      const categoryDetails = [];

      for (const category of focusArea.workCategories) {
        let categoryHasSkills = false;
        let categoryWorkTypesWithSkills = 0;

        for (const workType of category.workTypes) {
          totalWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount > 0) {
            workTypesWithSkills++;
            categoryHasSkills = true;
            categoryWorkTypesWithSkills++;
            hasDepthCoverage = true; // At least one complete pathway exists
          }
        }

        if (categoryHasSkills) {
          categoriesWithSkills++;
        }

        categoryDetails.push({
          name: category.label,
          totalWorkTypes: category.workTypes.length,
          workTypesWithSkills: categoryWorkTypesWithSkills,
          hasSkills: categoryHasSkills
        });
      }

      const coveragePercentage = totalWorkTypes > 0 ? 
        ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

      console.log(`   📊 Total Categories: ${focusArea.workCategories.length}`);
      console.log(`   📊 Categories with skills: ${categoriesWithSkills}`);
      console.log(`   📊 Total Work Types: ${totalWorkTypes}`);
      console.log(`   📊 Work Types with skills: ${workTypesWithSkills}`);
      console.log(`   📊 Coverage: ${coveragePercentage}%`);
      console.log(`   ${hasDepthCoverage ? '✅' : '❌'} Depth Coverage: ${hasDepthCoverage ? 'YES' : 'NO'}`);

      // Show category breakdown
      console.log(`   📋 Category Breakdown:`);
      categoryDetails.forEach(cat => {
        const status = cat.hasSkills ? '✅' : '❌';
        console.log(`      ${status} ${cat.name}: ${cat.workTypesWithSkills}/${cat.totalWorkTypes} work types with skills`);
      });

      console.log('');

      results.push({
        focusArea: focusAreaName,
        found: true,
        hasDepthCoverage,
        categoriesWithSkills,
        totalCategories: focusArea.workCategories.length,
        workTypesWithSkills,
        totalWorkTypes,
        coveragePercentage: parseFloat(coveragePercentage),
        categoryDetails
      });
    }

    // Summary
    console.log('📈 DEPTH COVERAGE SUMMARY:');
    console.log('');
    
    const withDepthCoverage = results.filter(r => r.hasDepthCoverage);
    const withoutDepthCoverage = results.filter(r => r.found && !r.hasDepthCoverage);
    const notFound = results.filter(r => !r.found);

    console.log(`✅ Focus Areas WITH Depth Coverage (${withDepthCoverage.length}):`);
    withDepthCoverage.forEach(result => {
      console.log(`   • ${result.focusArea}: ${result.categoriesWithSkills}/${result.totalCategories} categories, ${result.coveragePercentage}% coverage`);
    });

    console.log('');
    console.log(`❌ Focus Areas WITHOUT Depth Coverage (${withoutDepthCoverage.length}):`);
    withoutDepthCoverage.forEach(result => {
      console.log(`   • ${result.focusArea}: ${result.categoriesWithSkills}/${result.totalCategories} categories, ${result.coveragePercentage}% coverage`);
    });

    if (notFound.length > 0) {
      console.log('');
      console.log(`⚠️  Focus Areas NOT FOUND (${notFound.length}):`);
      notFound.forEach(result => {
        console.log(`   • ${result.focusArea}`);
      });
    }

    console.log('');
    console.log('🎯 NEXT ACTIONS NEEDED:');
    
    if (withoutDepthCoverage.length > 0) {
      console.log('The following focus areas need immediate attention to establish depth coverage:');
      withoutDepthCoverage.forEach(result => {
        console.log(`   • ${result.focusArea}: Add skills to at least one work type in any category`);
      });
    } else {
      console.log('✅ All target focus areas have depth coverage!');
    }

    console.log('');
    console.log('✅ Depth coverage analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });