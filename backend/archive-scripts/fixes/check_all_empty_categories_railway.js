const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// IMPORTANT: Always check Railway production database
const prisma = new PrismaClient();

async function checkAllEmptyCategoriesRailway() {
  try {
    console.log('🚂 CHECKING RAILWAY PRODUCTION: ALL Empty Work Categories Across ALL Focus Areas');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Find ANY work category across ANY focus area that has 0 work types');
    console.log('');

    // Get ALL work categories with their work types from Railway production
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

    console.log(`📋 Found ${allCategories.length} total work categories across ALL focus areas in Railway`);
    console.log('');

    // Analyze empty categories
    const emptyCategories = allCategories.filter(category => category.workTypes.length === 0);
    const categoriesWithWorkTypes = allCategories.filter(category => category.workTypes.length > 0);

    console.log('🔍 COMPREHENSIVE RAILWAY ANALYSIS - ALL FOCUS AREAS:');
    console.log('');

    if (emptyCategories.length === 0) {
      console.log('🎉 PERFECT! ALL WORK CATEGORIES HAVE WORK TYPES!');
      console.log('✅ Every work category across every focus area has at least one work type');
    } else {
      console.log(`❌ EMPTY CATEGORIES FOUND: ${emptyCategories.length}`);
      console.log('');
      console.log('📋 Work categories WITHOUT work types (across ALL focus areas):');
      
      // Group by focus area for better readability
      const emptyByFocusArea = {};
      emptyCategories.forEach(cat => {
        if (!emptyByFocusArea[cat.focusArea.label]) {
          emptyByFocusArea[cat.focusArea.label] = [];
        }
        emptyByFocusArea[cat.focusArea.label].push(cat);
      });

      Object.entries(emptyByFocusArea).forEach(([focusAreaLabel, categories]) => {
        console.log(`\n🔸 ${focusAreaLabel} Focus Area (${categories.length} empty categories):`);
        categories.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.label} (${cat.id}) - 0 work types ❌`);
        });
      });
    }

    console.log('');
    console.log('📊 RAILWAY PRODUCTION GLOBAL SUMMARY:');
    console.log(`📋 Total categories (all focus areas): ${allCategories.length}`);
    console.log(`✅ Categories WITH work types: ${categoriesWithWorkTypes.length}`);
    console.log(`❌ Categories WITHOUT work types: ${emptyCategories.length}`);
    console.log(`📈 Global coverage: ${allCategories.length > 0 ? ((categoriesWithWorkTypes.length / allCategories.length) * 100).toFixed(1) : 0}%`);
    console.log('');

    // Show detailed breakdown by focus area
    console.log('📊 DETAILED BREAKDOWN BY FOCUS AREA:');
    const focusAreaBreakdown = {};
    
    allCategories.forEach(cat => {
      if (!focusAreaBreakdown[cat.focusArea.label]) {
        focusAreaBreakdown[cat.focusArea.label] = {
          total: 0,
          withWorkTypes: 0,
          empty: 0,
          totalWorkTypes: 0
        };
      }
      focusAreaBreakdown[cat.focusArea.label].total++;
      focusAreaBreakdown[cat.focusArea.label].totalWorkTypes += cat.workTypes.length;
      
      if (cat.workTypes.length > 0) {
        focusAreaBreakdown[cat.focusArea.label].withWorkTypes++;
      } else {
        focusAreaBreakdown[cat.focusArea.label].empty++;
      }
    });

    Object.entries(focusAreaBreakdown).forEach(([focusArea, stats]) => {
      const coverage = stats.total > 0 ? ((stats.withWorkTypes / stats.total) * 100).toFixed(1) : 0;
      const status = stats.empty === 0 ? '✅' : '❌';
      console.log(`${status} ${focusArea}: ${stats.withWorkTypes}/${stats.total} categories (${coverage}%) | ${stats.totalWorkTypes} total work types`);
    });

    console.log('');
    
    if (emptyCategories.length > 0) {
      console.log('🎯 CRITICAL ISSUES FOUND:');
      console.log(`❌ ${emptyCategories.length} categories across ${Object.keys(emptyByFocusArea).length} focus areas need work types`);
      console.log('🔧 RECOMMENDATION: Create work types for empty categories or remove unused categories');
      console.log('');
      console.log('🚨 This affects user experience - empty categories may not function properly in UI');
      
      return { 
        hasEmptyCategories: true, 
        emptyCategories, 
        totalCategories: allCategories.length,
        focusAreasAffected: Object.keys(emptyByFocusArea).length 
      };
    } else {
      console.log('🎉 EXCELLENCE ACHIEVED: Railway production database is perfect!');
      console.log('✅ ALL work categories across ALL focus areas have work types');
      console.log('🚀 Professional skill taxonomy is complete and fully functional');
      
      return { 
        hasEmptyCategories: false, 
        emptyCategories: [], 
        totalCategories: allCategories.length,
        focusAreasAffected: 0 
      };
    }

  } catch (error) {
    console.error('❌ Error checking Railway empty categories:', error);
    if (error.message.includes('connect')) {
      console.log('💡 Connection issue - verify Railway DATABASE_URL is accessible');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllEmptyCategoriesRailway()
  .then(result => {
    if (result.hasEmptyCategories) {
      console.log(`\n🚨 URGENT: ${result.emptyCategories.length} empty categories found across ${result.focusAreasAffected} focus areas`);
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: Perfect taxonomy - all categories have work types in Railway');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });