const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeWorkTypes() {
  try {
    console.log('🔍 Analyzing Work Categories and Work Types...\n');

    // Fetch all focus areas with their work categories and work types
    const focusAreasWithData = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            workTypes: {
              orderBy: { label: 'asc' }
            }
          },
          orderBy: { label: 'asc' }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log('📊 WORK CATEGORIES ANALYSIS:\n');
    
    let totalCategories = 0;
    let categoriesWithEnoughTypes = 0;
    let categoriesNeedingMoreTypes = 0;
    const categoriesNeedingMore = [];

    for (const focusArea of focusAreasWithData) {
      console.log(`🎯 ${focusArea.label.toUpperCase()} FOCUS AREA:`);
      console.log(`   Total Categories: ${focusArea.workCategories.length}`);
      console.log('');

      for (const category of focusArea.workCategories) {
        totalCategories++;
        const workTypeCount = category.workTypes.length;
        const hasEnough = workTypeCount >= 8;
        
        if (hasEnough) {
          categoriesWithEnoughTypes++;
        } else {
          categoriesNeedingMoreTypes++;
          categoriesNeedingMore.push({
            focusArea: focusArea.label,
            focusAreaId: focusArea.id,
            category: category.label,
            categoryId: category.id,
            currentCount: workTypeCount,
            needed: 8 - workTypeCount,
            workTypes: category.workTypes.map(wt => ({ id: wt.id, label: wt.label }))
          });
        }

        const status = hasEnough ? '✅' : '❌';
        const statusText = hasEnough ? 'SUFFICIENT' : 'NEEDS MORE';
        
        console.log(`   ${status} ${category.label}: ${workTypeCount} work types (${statusText})`);
        
        if (!hasEnough && workTypeCount > 0) {
          console.log(`      Missing: ${8 - workTypeCount} work types needed`);
          console.log(`      Current work types: ${category.workTypes.map(wt => wt.label).join(', ')}`);
        } else if (workTypeCount === 0) {
          console.log(`      ⚠️  NO WORK TYPES FOUND - Needs 8 work types`);
        }
      }
      console.log('');
    }

    // Summary
    console.log('📈 OVERALL SUMMARY:');
    console.log(`Total Work Categories: ${totalCategories}`);
    console.log(`✅ Categories with 8+ work types: ${categoriesWithEnoughTypes}`);
    console.log(`❌ Categories with <8 work types: ${categoriesNeedingMoreTypes}`);
    console.log(`📊 Percentage with sufficient work types: ${((categoriesWithEnoughTypes / totalCategories) * 100).toFixed(1)}%`);
    console.log('');

    // Detailed breakdown of categories needing more work types
    if (categoriesNeedingMore.length > 0) {
      console.log('🎯 CATEGORIES NEEDING MORE WORK TYPES:');
      console.log('');
      
      // Group by focus area for better organization
      const groupedByFocusArea = {};
      categoriesNeedingMore.forEach(cat => {
        if (!groupedByFocusArea[cat.focusArea]) {
          groupedByFocusArea[cat.focusArea] = [];
        }
        groupedByFocusArea[cat.focusArea].push(cat);
      });

      for (const [focusAreaName, categories] of Object.entries(groupedByFocusArea)) {
        console.log(`📂 ${focusAreaName}:`);
        categories.forEach(cat => {
          console.log(`   📌 ${cat.category} (ID: ${cat.categoryId})`);
          console.log(`      Current: ${cat.currentCount} work types`);
          console.log(`      Needed: ${cat.needed} more work types`);
          if (cat.workTypes.length > 0) {
            console.log(`      Current work types:`);
            cat.workTypes.forEach(wt => {
              console.log(`        - ${wt.label} (${wt.id})`);
            });
          } else {
            console.log(`      ⚠️  No work types currently exist`);
          }
          console.log('');
        });
      }

      // Statistics by focus area
      console.log('📊 BREAKDOWN BY FOCUS AREA:');
      console.log('');
      
      for (const focusArea of focusAreasWithData) {
        const totalCats = focusArea.workCategories.length;
        const catsWithEnough = focusArea.workCategories.filter(cat => cat.workTypes.length >= 8).length;
        const catsNeedingMore = totalCats - catsWithEnough;
        const percentage = totalCats > 0 ? ((catsWithEnough / totalCats) * 100).toFixed(1) : 0;
        
        console.log(`${focusArea.label}:`);
        console.log(`   Total categories: ${totalCats}`);
        console.log(`   ✅ With 8+ work types: ${catsWithEnough}`);
        console.log(`   ❌ With <8 work types: ${catsNeedingMore}`);
        console.log(`   📊 Percentage sufficient: ${percentage}%`);
        console.log('');
      }

    } else {
      console.log('🎉 All work categories have sufficient work types!');
    }

    console.log('✅ Analysis completed successfully!');

  } catch (error) {
    console.error('❌ Error analyzing work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });