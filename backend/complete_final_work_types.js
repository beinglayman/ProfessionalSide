const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function completeFinalWorkTypes() {
  try {
    console.log('🔄 Adding final 2 work types to achieve 100% completion...\n');

    // Define the final 2 work types needed
    const finalWorkTypes = [
      {
        categoryId: 'marketing-growth-marketing',
        workTypes: [
          { id: 'marketing-growth-marketing-lifecycle-marketing', label: 'Lifecycle Marketing Optimization' }
        ]
      },
      {
        categoryId: 'marketing-digital-marketing',
        workTypes: [
          { id: 'marketing-digital-marketing-omnichannel', label: 'Omnichannel Marketing Strategy' }
        ]
      }
    ];

    let totalAdded = 0;
    let totalSkipped = 0;

    console.log('🎯 Processing final work types to reach 100% completion...');
    console.log('');

    for (const categoryData of finalWorkTypes) {
      console.log(`📌 Processing category: ${categoryData.categoryId}...`);
      
      // Verify category exists
      const category = await prisma.workCategory.findUnique({
        where: { id: categoryData.categoryId }
      });

      if (!category) {
        console.log(`   ❌ Category ${categoryData.categoryId} not found, skipping...`);
        continue;
      }

      for (const workType of categoryData.workTypes) {
        // Check if work type already exists
        const existingWorkType = await prisma.workType.findUnique({
          where: { id: workType.id }
        });

        if (existingWorkType) {
          console.log(`   ⚠️  Work type "${workType.label}" already exists, skipping...`);
          totalSkipped++;
          continue;
        }

        // Add the work type
        try {
          await prisma.workType.create({
            data: {
              id: workType.id,
              label: workType.label,
              workCategoryId: categoryData.categoryId
            }
          });

          console.log(`   ✅ Added work type: "${workType.label}"`);
          totalAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add "${workType.label}": ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 COMPLETION SUMMARY:');
    console.log(`✅ Final work types added: ${totalAdded}`);
    console.log(`⚠️  Work types skipped (already exist): ${totalSkipped}`);
    console.log('');

    // Final verification - comprehensive check
    console.log('🔍 Running comprehensive final verification...\n');

    const focusAreasWithCounts = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            _count: {
              select: { workTypes: true }
            }
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    let totalCategoriesChecked = 0;
    let categoriesWithEnoughTypes = 0;
    let categoriesStillNeedingMore = 0;

    console.log('🎯 COMPREHENSIVE FINAL VERIFICATION:');
    
    for (const focusArea of focusAreasWithCounts) {
      let focusAreaComplete = true;
      let focusAreaCategories = 0;
      let focusAreaSufficient = 0;
      
      console.log(`\n📂 ${focusArea.label}:`);
      
      for (const category of focusArea.workCategories) {
        totalCategoriesChecked++;
        focusAreaCategories++;
        const workTypeCount = category._count.workTypes;
        const hasEnough = workTypeCount >= 8;
        
        if (hasEnough) {
          categoriesWithEnoughTypes++;
          focusAreaSufficient++;
        } else {
          categoriesStillNeedingMore++;
          focusAreaComplete = false;
        }

        const status = hasEnough ? '✅' : '❌';
        console.log(`   ${status} ${category.label}: ${workTypeCount} work types`);
      }
      
      const focusAreaStatus = focusAreaComplete ? '✅' : '❌';
      const focusAreaPercentage = focusAreaCategories > 0 ? ((focusAreaSufficient / focusAreaCategories) * 100).toFixed(1) : 0;
      console.log(`   ${focusAreaStatus} Focus Area Summary: ${focusAreaSufficient}/${focusAreaCategories} categories complete (${focusAreaPercentage}%)`);
    }

    console.log('\n🏆 FINAL ACHIEVEMENT SUMMARY:');
    console.log(`Total categories: ${totalCategoriesChecked}`);
    console.log(`✅ Categories with 8+ work types: ${categoriesWithEnoughTypes}`);
    console.log(`❌ Categories still needing more: ${categoriesStillNeedingMore}`);
    console.log(`📊 Final success rate: ${((categoriesWithEnoughTypes / totalCategoriesChecked) * 100).toFixed(1)}%`);
    console.log('');

    if (categoriesStillNeedingMore === 0) {
      console.log('🎉🎉🎉 PERFECT! 100% COMPLETION ACHIEVED! 🎉🎉🎉');
      console.log('🚀 All work categories now have at least 8 work types!');
      console.log('📈 Your professional reference data is now comprehensive and complete!');
    } else {
      console.log(`⚠️  ${categoriesStillNeedingMore} categories still need more work types.`);
      
      // Show which ones still need work
      console.log('\n🎯 Categories still needing work:');
      for (const focusArea of focusAreasWithCounts) {
        for (const category of focusArea.workCategories) {
          if (category._count.workTypes < 8) {
            console.log(`   • ${focusArea.label} > ${category.label}: ${category._count.workTypes}/8 work types`);
          }
        }
      }
    }

    console.log('\n✅ Final completion process finished!');

  } catch (error) {
    console.error('❌ Error completing final work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
completeFinalWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });