const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// IMPORTANT: Always check Railway production database
const prisma = new PrismaClient();

async function checkRailwayEmptyCategories() {
  try {
    console.log('🚂 CHECKING RAILWAY PRODUCTION: Work Categories Without Work Types');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Find any work category that has 0 work types');
    console.log('');

    // Get ALL work categories with their work types from Railway
    const allCategories = await prisma.workCategory.findMany({
      include: {
        focusArea: true,
        workTypes: true
      },
      orderBy: [
        { focusArea: { label: 'asc' } },
        { label: 'asc' }
      ]
    });

    console.log(`📋 Found ${allCategories.length} total work categories in Railway`);
    console.log('');

    // Find empty categories
    const emptyCategories = allCategories.filter(category => category.workTypes.length === 0);
    const categoriesWithWorkTypes = allCategories.filter(category => category.workTypes.length > 0);

    console.log('🔍 RAILWAY PRODUCTION ANALYSIS:');
    console.log('');

    if (emptyCategories.length === 0) {
      console.log('🎉 ALL WORK CATEGORIES HAVE WORK TYPES!');
      console.log('✅ Every work category in Railway has at least one work type');
    } else {
      console.log(`❌ EMPTY CATEGORIES FOUND: ${emptyCategories.length}`);
      console.log('');
      console.log('📋 Work categories WITHOUT work types:');
      
      // Group by focus area for better readability
      const emptyByFocusArea = {};
      emptyCategories.forEach(cat => {
        if (!emptyByFocusArea[cat.focusArea.label]) {
          emptyByFocusArea[cat.focusArea.label] = [];
        }
        emptyByFocusArea[cat.focusArea.label].push(cat);
      });

      Object.entries(emptyByFocusArea).forEach(([focusAreaLabel, categories]) => {
        console.log(`\n🔸 ${focusAreaLabel} Focus Area:`);
        categories.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.label} (${cat.id}) - 0 work types`);
        });
      });
    }

    console.log('');
    console.log('📊 RAILWAY PRODUCTION SUMMARY:');
    console.log(`📋 Total categories: ${allCategories.length}`);
    console.log(`✅ Categories WITH work types: ${categoriesWithWorkTypes.length}`);
    console.log(`❌ Categories WITHOUT work types: ${emptyCategories.length}`);
    console.log(`📈 Coverage: ${allCategories.length > 0 ? ((categoriesWithWorkTypes.length / allCategories.length) * 100).toFixed(1) : 0}%`);
    console.log('');

    // Show breakdown by focus area
    console.log('📊 BREAKDOWN BY FOCUS AREA:');
    const focusAreaBreakdown = {};
    
    allCategories.forEach(cat => {
      if (!focusAreaBreakdown[cat.focusArea.label]) {
        focusAreaBreakdown[cat.focusArea.label] = {
          total: 0,
          withWorkTypes: 0,
          empty: 0
        };
      }
      focusAreaBreakdown[cat.focusArea.label].total++;
      if (cat.workTypes.length > 0) {
        focusAreaBreakdown[cat.focusArea.label].withWorkTypes++;
      } else {
        focusAreaBreakdown[cat.focusArea.label].empty++;
      }
    });

    Object.entries(focusAreaBreakdown).forEach(([focusArea, stats]) => {
      const coverage = stats.total > 0 ? ((stats.withWorkTypes / stats.total) * 100).toFixed(1) : 0;
      const status = stats.empty === 0 ? '✅' : '❌';
      console.log(`${status} ${focusArea}: ${stats.withWorkTypes}/${stats.total} categories (${coverage}%)`);
    });

    console.log('');
    
    if (emptyCategories.length > 0) {
      console.log('🎯 RECOMMENDATION:');
      console.log('Create work types for empty categories or consider removing unused categories');
      return { hasEmptyCategories: true, emptyCategories, totalCategories: allCategories.length };
    } else {
      console.log('🎉 PERFECT: All work categories have work types in Railway production!');
      return { hasEmptyCategories: false, emptyCategories: [], totalCategories: allCategories.length };
    }

  } catch (error) {
    console.error('❌ Error checking Railway empty categories:', error);
    if (error.message.includes('connect')) {
      console.log('💡 Connection issue - verify Railway DATABASE_URL');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRailwayEmptyCategories()
  .then(result => {
    if (result.hasEmptyCategories) {
      console.log('\n🚨 ACTION REQUIRED: Empty categories found in Railway');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: All categories have work types in Railway');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });