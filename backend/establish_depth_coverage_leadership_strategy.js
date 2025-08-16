const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function establishDepthCoverage() {
  try {
    console.log('🔄 Establishing Depth Coverage for Leadership & Strategy Focus Areas...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Targeted skill mappings to establish depth coverage (1 work type per category)
    const skillMappings = [
      // LEADERSHIP FOCUS AREA - One work type per category to establish depth
      {
        workTypeId: 'leadership-team-management-team-building',
        skillNames: ['Team Leadership', 'Team Building', 'Communication', 'People Management']
      },
      {
        workTypeId: 'leadership-executive-leadership-executive-decision-making',
        skillNames: ['Executive Leadership', 'Strategic Thinking', 'Decision Making', 'Leadership']
      },
      {
        workTypeId: 'leadership-people-management-performance-management',
        skillNames: ['Performance Management', 'People Management', 'Team Leadership', 'Employee Development']
      },
      {
        workTypeId: 'leadership-change-management-organizational-change',
        skillNames: ['Change Management', 'Organizational Change', 'Leadership', 'Communication']
      },
      {
        workTypeId: 'leadership-organizational-development-culture-development',
        skillNames: ['Organizational Development', 'Culture Development', 'Leadership', 'Strategic Planning']
      },
      {
        workTypeId: 'leadership-strategic-leadership-vision-setting',
        skillNames: ['Strategic Leadership', 'Vision Development', 'Strategic Planning', 'Leadership']
      },
      {
        workTypeId: 'leadership-cross-functional-leadership-cross-functional-coordination',
        skillNames: ['Cross-functional Leadership', 'Cross-functional Coordination', 'Team Leadership', 'Collaboration']
      },
      {
        workTypeId: 'leadership-crisis-management-crisis-leadership',
        skillNames: ['Crisis Management', 'Crisis Leadership', 'Leadership', 'Decision Making']
      },

      // STRATEGY FOCUS AREA - One work type per category to establish depth
      {
        workTypeId: 'strategy-business-strategy-strategic-planning',
        skillNames: ['Strategic Planning', 'Business Strategy', 'Strategic Analysis', 'Strategic Thinking']
      },
      {
        workTypeId: 'strategy-corporate-development-ma-strategy',
        skillNames: ['Corporate Development', 'M&A Strategy', 'Strategic Planning', 'Business Development']
      },
      {
        workTypeId: 'strategy-strategic-planning-long-term-planning',
        skillNames: ['Strategic Planning', 'Long-term Planning', 'Strategic Analysis', 'Business Planning']
      },
      {
        workTypeId: 'strategy-market-analysis-market-research',
        skillNames: ['Market Analysis', 'Market Research', 'Strategic Analysis', 'Competitive Analysis']
      },
      {
        workTypeId: 'strategy-competitive-intelligence-competitive-analysis',
        skillNames: ['Competitive Intelligence', 'Competitive Analysis', 'Market Research', 'Strategic Analysis']
      },
      {
        workTypeId: 'strategy-business-development-growth-strategy',
        skillNames: ['Business Development', 'Growth Strategy', 'Strategic Planning', 'Business Strategy']
      },
      {
        workTypeId: 'strategy-partnership-strategy-strategic-partnerships',
        skillNames: ['Partnership Strategy', 'Strategic Partnerships', 'Business Development', 'Strategic Planning']
      },
      {
        workTypeId: 'strategy-digital-transformation-digital-strategy',
        skillNames: ['Digital Transformation', 'Digital Strategy', 'Strategic Planning', 'Change Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} depth coverage skill mappings...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalMappingsSkipped = 0;
    let workTypesNotFound = 0;
    let skillsNotFound = 0;
    const missingSkills = new Set();
    const missingWorkTypes = new Set();

    for (const mapping of skillMappings) {
      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`❌ Work type not found: ${mapping.workTypeId}`);
        workTypesNotFound++;
        missingWorkTypes.add(mapping.workTypeId);
        continue;
      }

      console.log(`📌 Processing work type: ${workType.label}`);

      for (const skillName of mapping.skillNames) {
        // Find the skill by name (case-insensitive)
        const skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          console.log(`   ⚠️  Skill not found in database: "${skillName}"`);
          skillsNotFound++;
          missingSkills.add(skillName);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Mapping already exists: ${skillName}`);
          totalMappingsSkipped++;
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Added skill mapping: ${skillName}`);
          totalMappingsAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add mapping for ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 DEPTH COVERAGE ESTABLISHMENT SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`⚠️  Skill mappings skipped (already exist): ${totalMappingsSkipped}`);
    console.log(`❌ Work types not found: ${workTypesNotFound}`);
    console.log(`❌ Skills not found in database: ${skillsNotFound}`);
    console.log('');

    if (missingSkills.size > 0) {
      console.log('🔍 Missing Skills Found:');
      Array.from(missingSkills).forEach(skill => {
        console.log(`   • ${skill}`);
      });
      console.log('');
    }

    if (missingWorkTypes.size > 0) {
      console.log('🔍 Missing Work Types Found:');
      Array.from(missingWorkTypes).forEach(workType => {
        console.log(`   • ${workType}`);
      });
      console.log('');
    }

    // Verify depth coverage has been established
    console.log('🔍 Verifying Depth Coverage...');
    
    const leadershipArea = await prisma.focusArea.findFirst({
      where: { 
        label: { contains: 'Leadership', mode: 'insensitive' }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: { workTypeSkills: true }
            }
          }
        }
      }
    });

    const strategyArea = await prisma.focusArea.findFirst({
      where: { 
        label: { contains: 'Strategy', mode: 'insensitive' }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: { workTypeSkills: true }
            }
          }
        }
      }
    });

    // Check Leadership
    if (leadershipArea) {
      let leadershipWorkTypesWithSkills = 0;
      let leadershipTotalWorkTypes = 0;
      
      leadershipArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          leadershipTotalWorkTypes++;
          if (workType.workTypeSkills.length > 0) {
            leadershipWorkTypesWithSkills++;
          }
        });
      });

      const leadershipCoverage = leadershipTotalWorkTypes > 0 ? 
        ((leadershipWorkTypesWithSkills / leadershipTotalWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Leadership Focus Area:`);
      console.log(`   Total work types: ${leadershipTotalWorkTypes}`);
      console.log(`   ✅ With skills: ${leadershipWorkTypesWithSkills}`);
      console.log(`   📊 Coverage: ${leadershipCoverage}%`);
      console.log(`   ${leadershipWorkTypesWithSkills > 0 ? '✅' : '❌'} Depth Coverage: ${leadershipWorkTypesWithSkills > 0 ? 'ESTABLISHED' : 'NOT ESTABLISHED'}`);
    }

    // Check Strategy
    if (strategyArea) {
      let strategyWorkTypesWithSkills = 0;
      let strategyTotalWorkTypes = 0;
      
      strategyArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          strategyTotalWorkTypes++;
          if (workType.workTypeSkills.length > 0) {
            strategyWorkTypesWithSkills++;
          }
        });
      });

      const strategyCoverage = strategyTotalWorkTypes > 0 ? 
        ((strategyWorkTypesWithSkills / strategyTotalWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Strategy Focus Area:`);
      console.log(`   Total work types: ${strategyTotalWorkTypes}`);
      console.log(`   ✅ With skills: ${strategyWorkTypesWithSkills}`);
      console.log(`   📊 Coverage: ${strategyCoverage}%`);
      console.log(`   ${strategyWorkTypesWithSkills > 0 ? '✅' : '❌'} Depth Coverage: ${strategyWorkTypesWithSkills > 0 ? 'ESTABLISHED' : 'NOT ESTABLISHED'}`);
    }

    console.log('');
    console.log('ℹ️  Depth coverage establishment targets one work type per category.');
    console.log('   This ensures complete pathways: Focus Area > Work Category > Work Type > Skill.');
    console.log('');
    console.log('✅ Depth coverage establishment completed!');

  } catch (error) {
    console.error('❌ Error establishing depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
establishDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });