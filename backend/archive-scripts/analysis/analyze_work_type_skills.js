const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeWorkTypeSkills() {
  try {
    console.log('🔍 Analyzing Work Type-Skill mappings across all focus areas...\n');

    // Fetch all focus areas with their work categories, work types, and skill mappings
    const focusAreasWithData = await prisma.focusArea.findMany({
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
      },
      orderBy: { label: 'asc' }
    });

    console.log('📊 WORK TYPE-SKILL MAPPING ANALYSIS:\n');
    
    let totalWorkTypes = 0;
    let workTypesWithEnoughSkills = 0;
    let workTypesNeedingMoreSkills = 0;
    const workTypesNeedingMore = [];

    for (const focusArea of focusAreasWithData) {
      console.log(`🎯 ${focusArea.label.toUpperCase()} FOCUS AREA:`);
      console.log(`   Total Categories: ${focusArea.workCategories.length}`);
      
      let focusAreaWorkTypes = 0;
      let focusAreaSufficient = 0;
      let focusAreaInsufficient = 0;

      for (const category of focusArea.workCategories) {
        console.log(`\n   📂 ${category.label} (${category.workTypes.length} work types):`);
        
        for (const workType of category.workTypes) {
          totalWorkTypes++;
          focusAreaWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          const hasEnough = skillCount >= 4;
          
          if (hasEnough) {
            workTypesWithEnoughSkills++;
            focusAreaSufficient++;
          } else {
            workTypesNeedingMoreSkills++;
            focusAreaInsufficient++;
            workTypesNeedingMore.push({
              focusArea: focusArea.label,
              focusAreaId: focusArea.id,
              category: category.label,
              categoryId: category.id,
              workType: workType.label,
              workTypeId: workType.id,
              currentSkillCount: skillCount,
              needed: 4 - skillCount,
              currentSkills: workType.workTypeSkills.map(wts => ({
                id: wts.skill.id,
                name: wts.skill.name,
                category: wts.skill.category
              }))
            });
          }

          const status = hasEnough ? '✅' : '❌';
          const statusText = hasEnough ? 'SUFFICIENT' : 'NEEDS MORE';
          
          console.log(`      ${status} ${workType.label}: ${skillCount} skills (${statusText})`);
          
          if (!hasEnough && skillCount > 0) {
            console.log(`         Missing: ${4 - skillCount} skills needed`);
            console.log(`         Current skills: ${workType.workTypeSkills.map(wts => wts.skill.name).join(', ')}`);
          } else if (skillCount === 0) {
            console.log(`         ⚠️  NO SKILLS MAPPED - Needs 4 skills`);
          }
        }
      }
      
      const focusAreaPercentage = focusAreaWorkTypes > 0 ? ((focusAreaSufficient / focusAreaWorkTypes) * 100).toFixed(1) : 0;
      console.log(`\n   📈 ${focusArea.label} Summary:`);
      console.log(`      Total Work Types: ${focusAreaWorkTypes}`);
      console.log(`      ✅ With 4+ skills: ${focusAreaSufficient}`);
      console.log(`      ❌ With <4 skills: ${focusAreaInsufficient}`);
      console.log(`      📊 Percentage sufficient: ${focusAreaPercentage}%`);
      console.log('');
    }

    // Overall Summary
    console.log('📈 OVERALL SUMMARY:');
    console.log(`Total Work Types: ${totalWorkTypes}`);
    console.log(`✅ Work Types with 4+ skills: ${workTypesWithEnoughSkills}`);
    console.log(`❌ Work Types with <4 skills: ${workTypesNeedingMoreSkills}`);
    console.log(`📊 Overall success rate: ${((workTypesWithEnoughSkills / totalWorkTypes) * 100).toFixed(1)}%`);
    console.log('');

    // Detailed breakdown of work types needing more skills
    if (workTypesNeedingMore.length > 0) {
      console.log('🎯 WORK TYPES NEEDING MORE SKILLS:');
      console.log('');
      
      // Group by focus area for better organization
      const groupedByFocusArea = {};
      workTypesNeedingMore.forEach(wt => {
        if (!groupedByFocusArea[wt.focusArea]) {
          groupedByFocusArea[wt.focusArea] = {};
        }
        if (!groupedByFocusArea[wt.focusArea][wt.category]) {
          groupedByFocusArea[wt.focusArea][wt.category] = [];
        }
        groupedByFocusArea[wt.focusArea][wt.category].push(wt);
      });

      for (const [focusAreaName, categories] of Object.entries(groupedByFocusArea)) {
        console.log(`📂 ${focusAreaName}:`);
        
        for (const [categoryName, workTypes] of Object.entries(categories)) {
          console.log(`   📌 ${categoryName}:`);
          
          workTypes.forEach(wt => {
            console.log(`      🔹 ${wt.workType} (ID: ${wt.workTypeId})`);
            console.log(`         Current: ${wt.currentSkillCount} skills`);
            console.log(`         Needed: ${wt.needed} more skills`);
            if (wt.currentSkills.length > 0) {
              console.log(`         Current skills:`);
              wt.currentSkills.forEach(skill => {
                console.log(`           • ${skill.name} (${skill.category || 'No category'})`);
              });
            } else {
              console.log(`         ⚠️  No skills currently mapped`);
            }
            console.log('');
          });
        }
        console.log('');
      }

      // Statistics by focus area
      console.log('📊 BREAKDOWN BY FOCUS AREA:');
      console.log('');
      
      for (const focusArea of focusAreasWithData) {
        const totalWorkTypesInArea = focusArea.workCategories.reduce((sum, cat) => sum + cat.workTypes.length, 0);
        const workTypesWithEnough = focusArea.workCategories.reduce((sum, cat) => {
          return sum + cat.workTypes.filter(wt => wt.workTypeSkills.length >= 4).length;
        }, 0);
        const workTypesNeedingMore = totalWorkTypesInArea - workTypesWithEnough;
        const percentage = totalWorkTypesInArea > 0 ? ((workTypesWithEnough / totalWorkTypesInArea) * 100).toFixed(1) : 0;
        
        console.log(`${focusArea.label}:`);
        console.log(`   Total work types: ${totalWorkTypesInArea}`);
        console.log(`   ✅ With 4+ skills: ${workTypesWithEnough}`);
        console.log(`   ❌ With <4 skills: ${workTypesNeedingMore}`);
        console.log(`   📊 Percentage sufficient: ${percentage}%`);
        console.log('');
      }

      // Calculate total skills needed
      const totalSkillsNeeded = workTypesNeedingMore.reduce((sum, wt) => sum + wt.needed, 0);
      console.log(`📈 SKILLS MAPPING REQUIREMENTS:`);
      console.log(`Total skill mappings needed: ${totalSkillsNeeded}`);
      console.log(`Work types requiring attention: ${workTypesNeedingMore.length}`);
      console.log('');

    } else {
      console.log('🎉 All work types have sufficient skill mappings!');
    }

    console.log('✅ Analysis completed successfully!');

  } catch (error) {
    console.error('❌ Error analyzing work type skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
analyzeWorkTypeSkills()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });