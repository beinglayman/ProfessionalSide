const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeFocusAreasSummary() {
  try {
    console.log('🔍 Focus Areas Priority Analysis - Summary View...\n');

    // Fetch all focus areas with their work types and skill mappings
    const focusAreasWithData = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: true
              }
            }
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log('📊 FOCUS AREAS COVERAGE SUMMARY:\n');
    
    let totalWorkTypesAllAreas = 0;
    let totalWorkTypesWithEnoughSkills = 0;
    const focusAreaStats = [];

    for (const focusArea of focusAreasWithData) {
      let focusAreaWorkTypes = 0;
      let focusAreaSufficient = 0;
      let focusAreaInsufficient = 0;

      // Count work types and their skill coverage
      for (const category of focusArea.workCategories) {
        for (const workType of category.workTypes) {
          totalWorkTypesAllAreas++;
          focusAreaWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          const hasEnough = skillCount >= 4;
          
          if (hasEnough) {
            totalWorkTypesWithEnoughSkills++;
            focusAreaSufficient++;
          } else {
            focusAreaInsufficient++;
          }
        }
      }
      
      const focusAreaPercentage = focusAreaWorkTypes > 0 ? 
        ((focusAreaSufficient / focusAreaWorkTypes) * 100).toFixed(1) : 0;

      focusAreaStats.push({
        name: focusArea.label,
        totalWorkTypes: focusAreaWorkTypes,
        sufficient: focusAreaSufficient,
        insufficient: focusAreaInsufficient,
        percentage: parseFloat(focusAreaPercentage),
        skillsNeeded: focusAreaInsufficient * 4, // Rough estimate assuming average 2 skills per insufficient work type
        priority: focusAreaWorkTypes > 0 ? (focusAreaInsufficient / focusAreaWorkTypes) : 0 // Priority by percentage needing work
      });
    }

    // Sort by priority (highest percentage needing work first, then by size)
    focusAreaStats.sort((a, b) => {
      if (Math.abs(a.priority - b.priority) < 0.1) {
        return b.totalWorkTypes - a.totalWorkTypes; // If similar priority, prefer larger areas
      }
      return b.priority - a.priority;
    });

    console.log('🎯 FOCUS AREAS RANKED BY PRIORITY:\n');
    
    focusAreaStats.forEach((stats, index) => {
      const priorityEmoji = index < 3 ? '🔥' : index < 6 ? '⚡' : '📋';
      const statusEmoji = stats.percentage >= 50 ? '✅' : stats.percentage >= 25 ? '⚠️' : '❌';
      
      console.log(`${index + 1}. ${priorityEmoji} ${stats.name}`);
      console.log(`   ${statusEmoji} Coverage: ${stats.percentage}% (${stats.sufficient}/${stats.totalWorkTypes} work types)`);
      console.log(`   ❌ Needs attention: ${stats.insufficient} work types`);
      console.log(`   📈 Estimated mappings needed: ~${stats.skillsNeeded}`);
      console.log('');
    });

    // Overall summary
    const overallPercentage = totalWorkTypesAllAreas > 0 ? 
      ((totalWorkTypesWithEnoughSkills / totalWorkTypesAllAreas) * 100).toFixed(1) : 0;

    console.log('📈 OVERALL SYSTEM SUMMARY:');
    console.log(`   Total Work Types: ${totalWorkTypesAllAreas}`);
    console.log(`   ✅ With 4+ skills: ${totalWorkTypesWithEnoughSkills}`);
    console.log(`   ❌ With <4 skills: ${totalWorkTypesAllAreas - totalWorkTypesWithEnoughSkills}`);
    console.log(`   📊 Overall coverage: ${overallPercentage}%`);
    console.log('');

    // Recommendations for next batches
    console.log('🚀 RECOMMENDED BATCH STRATEGY:');
    console.log('');
    
    const topPriorities = focusAreaStats.slice(0, 5);
    topPriorities.forEach((stats, index) => {
      console.log(`Batch ${5 + index}: ${stats.name}`);
      console.log(`   Target: Improve from ${stats.percentage}% to 60%+`);
      console.log(`   Work types to address: ${Math.min(20, stats.insufficient)} (sample)`);
      console.log(`   Expected mappings: ~${Math.min(20, stats.insufficient) * 4}`);
      console.log('');
    });

    console.log('✅ Focus areas priority analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing focus areas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeFocusAreasSummary()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });