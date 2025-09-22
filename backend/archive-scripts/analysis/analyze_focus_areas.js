const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeFocusAreas() {
  try {
    console.log('🔍 Analyzing Focus Areas and Work Categories...\n');

    // Fetch all focus areas with their work categories
    const focusAreasWithCategories = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          orderBy: { label: 'asc' }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log('📊 FOCUS AREAS ANALYSIS:\n');
    
    const focusAreaStats = [];
    let totalWithEnough = 0;
    let totalWithoutEnough = 0;

    for (const focusArea of focusAreasWithCategories) {
      const categoryCount = focusArea.workCategories.length;
      const hasEnough = categoryCount >= 8;
      
      if (hasEnough) {
        totalWithEnough++;
      } else {
        totalWithoutEnough++;
      }

      const status = hasEnough ? '✅' : '❌';
      const statusText = hasEnough ? 'SUFFICIENT' : 'NEEDS MORE';
      
      console.log(`${status} ${focusArea.label}: ${categoryCount} categories (${statusText})`);
      
      if (!hasEnough) {
        console.log(`   Missing: ${8 - categoryCount} categories needed`);
        console.log(`   Current categories:`, focusArea.workCategories.map(wc => wc.label).join(', '));
      }
      
      focusAreaStats.push({
        focusArea: focusArea.label,
        focusAreaId: focusArea.id,
        categoryCount,
        hasEnough,
        categories: focusArea.workCategories.map(wc => ({ id: wc.id, label: wc.label }))
      });
      
      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📈 SUMMARY:');
    console.log(`Total Focus Areas: ${focusAreasWithCategories.length}`);
    console.log(`✅ Focus Areas with 8+ categories: ${totalWithEnough}`);
    console.log(`❌ Focus Areas with <8 categories: ${totalWithoutEnough}`);
    console.log('');

    // Focus areas that need more categories
    const focusAreasNeedingMore = focusAreaStats.filter(fa => !fa.hasEnough);
    
    if (focusAreasNeedingMore.length > 0) {
      console.log('🎯 FOCUS AREAS NEEDING MORE CATEGORIES:');
      console.log('');
      
      focusAreasNeedingMore.forEach(fa => {
        console.log(`📌 ${fa.focusArea} (ID: ${fa.focusAreaId})`);
        console.log(`   Current: ${fa.categoryCount} categories`);
        console.log(`   Needed: ${8 - fa.categoryCount} more categories`);
        console.log(`   Current categories:`);
        fa.categories.forEach(cat => {
          console.log(`     - ${cat.label} (${cat.id})`);
        });
        console.log('');
      });
    } else {
      console.log('🎉 All focus areas have sufficient work categories!');
    }

    // Detailed breakdown by focus area
    console.log('📋 DETAILED BREAKDOWN:');
    console.log('');
    
    focusAreaStats.forEach(fa => {
      console.log(`▶️ ${fa.focusArea} (${fa.categoryCount} categories):`);
      fa.categories.forEach(cat => {
        console.log(`   • ${cat.label}`);
      });
      console.log('');
    });

    console.log('✅ Analysis completed successfully!');

  } catch (error) {
    console.error('❌ Error analyzing focus areas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeFocusAreas()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });