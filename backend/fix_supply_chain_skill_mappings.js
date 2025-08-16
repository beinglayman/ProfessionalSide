const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Helper function to generate skill slug
function generateSkillSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

async function fixSupplyChainSkillMappings() {
  try {
    console.log('🔧 FIXING SUPPLY CHAIN SKILL MAPPINGS - COMPREHENSIVE APPROACH');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Ensure EVERY Supply Chain work type has at least 2-4 relevant skills');
    console.log('');

    // Step 1: Get all Supply Chain work types with current mappings
    console.log('🔍 Step 1: Analyzing current Supply Chain work types...');
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: 'operations-supply-chain'
      },
      include: {
        workTypeSkills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log(`📋 Found ${supplyChainWorkTypes.length} Supply Chain work types`);
    console.log('');

    // Step 2: Analyze current state
    let workTypesWithSkills = 0;
    let workTypesWithoutSkills = 0;
    const unmappedWorkTypes = [];

    console.log('📊 CURRENT STATE ANALYSIS:');
    supplyChainWorkTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      if (skillCount > 0) {
        workTypesWithSkills++;
        const skills = workType.workTypeSkills.map(wts => wts.skill.name).join(', ');
        console.log(`✅ ${workType.label}: ${skillCount} skills (${skills})`);
      } else {
        workTypesWithoutSkills++;
        console.log(`❌ ${workType.label}: NO SKILLS`);
        unmappedWorkTypes.push(workType);
      }
    });

    console.log('');
    console.log(`📈 Current coverage: ${workTypesWithSkills}/${supplyChainWorkTypes.length} work types have skills`);
    console.log('');

    if (unmappedWorkTypes.length === 0) {
      console.log('🎉 All Supply Chain work types already have skills mapped!');
      return;
    }

    // Step 3: Get all available skills
    console.log('🔍 Step 2: Getting all available skills...');
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`📋 Available skills: ${allSkills.length}`);
    console.log('');

    // Step 4: Define comprehensive skill mappings for ALL Supply Chain work types
    console.log('🔧 Step 3: Creating comprehensive skill mappings...');
    
    // Define skill mappings for each Supply Chain work type
    const comprehensiveSkillMappings = [
      // Demand Planning & Forecasting
      {
        workTypeLabel: 'Demand Planning & Forecasting',
        skillNames: ['Supply Chain Management', 'Demand Planning', 'Forecasting', 'Analytics', 'Data Analysis']
      },
      // Inventory Management
      {
        workTypeLabel: 'Inventory Management',
        skillNames: ['Supply Chain Management', 'Inventory Management', 'Operations Management', 'Data Analysis', 'Process Optimization']
      },
      // Logistics & Distribution
      {
        workTypeLabel: 'Logistics & Distribution',
        skillNames: ['Supply Chain Management', 'Logistics', 'Operations Management', 'Distribution', 'Transportation']
      },
      // Procurement Management
      {
        workTypeLabel: 'Procurement Management',
        skillNames: ['Supply Chain Management', 'Procurement', 'Vendor Management', 'Contract Management', 'Strategic Sourcing']
      },
      // Strategic Sourcing
      {
        workTypeLabel: 'Strategic Sourcing',
        skillNames: ['Supply Chain Management', 'Strategic Sourcing', 'Vendor Management', 'Procurement', 'Cost Analysis']
      },
      // Supplier Relationship Management
      {
        workTypeLabel: 'Supplier Relationship Management',
        skillNames: ['Supply Chain Management', 'Vendor Management', 'Relationship Building', 'Contract Management', 'Performance Management']
      },
      // Supply Chain Optimization
      {
        workTypeLabel: 'Supply Chain Optimization',
        skillNames: ['Supply Chain Management', 'Process Optimization', 'Analytics', 'Performance Analysis', 'Continuous Improvement']
      },
      // Supply Chain Risk Management
      {
        workTypeLabel: 'Supply Chain Risk Management',
        skillNames: ['Supply Chain Management', 'Risk Management', 'Risk Assessment', 'Business Continuity', 'Mitigation Planning']
      }
    ];

    console.log(`🎯 Processing ${comprehensiveSkillMappings.length} comprehensive skill mapping patterns...`);
    console.log('');

    let totalSkillsCreated = 0;
    let totalMappingsCreated = 0;
    let processedWorkTypes = 0;

    for (const mapping of comprehensiveSkillMappings) {
      // Find the matching work type
      const workType = supplyChainWorkTypes.find(wt => 
        wt.label.toLowerCase().includes(mapping.workTypeLabel.toLowerCase()) ||
        mapping.workTypeLabel.toLowerCase().includes(wt.label.toLowerCase())
      );

      if (!workType) {
        console.log(`⚠️  Work type not found for pattern: ${mapping.workTypeLabel}`);
        continue;
      }

      console.log(`📌 Processing: ${workType.label} (${workType.id})`);
      processedWorkTypes++;

      for (const skillName of mapping.skillNames) {
        // Find or create skill
        let skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          // Create missing skill
          try {
            const skillId = generateSkillSlug(skillName);
            skill = await prisma.skill.create({
              data: {
                id: skillId,
                name: skillName
              }
            });
            allSkills.push(skill); // Add to cache
            totalSkillsCreated++;
            console.log(`   🔧 Created skill: ${skillName}`);
          } catch (error) {
            if (error.code === 'P2002') {
              // Skill exists, try to find it
              skill = await prisma.skill.findFirst({
                where: { name: skillName }
              });
              if (skill) {
                allSkills.push(skill);
                console.log(`   🔍 Found existing skill: ${skillName}`);
              }
            } else {
              console.log(`   ❌ Failed to create skill "${skillName}": ${error.message}`);
              continue;
            }
          }
        }

        if (!skill) {
          console.log(`   ❌ Could not find or create skill: ${skillName}`);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: workType.id,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Already mapped: ${skillName}`);
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: workType.id,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Mapped: ${skillName}`);
          totalMappingsCreated++;
        } catch (error) {
          console.log(`   ❌ Failed to map ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 SUPPLY CHAIN SKILL MAPPING SUMMARY:');
    console.log(`✅ Work types processed: ${processedWorkTypes}`);
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings created: ${totalMappingsCreated}`);
    console.log('');

    // Step 5: Final verification
    console.log('🔍 Step 4: Final verification of Supply Chain skill mappings...');
    const finalSupplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: 'operations-supply-chain'
      },
      include: {
        workTypeSkills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log('✅ FINAL SUPPLY CHAIN WORK TYPES STATUS:');
    let finalWorkTypesWithSkills = 0;
    let finalWorkTypesWithoutSkills = 0;

    finalSupplyChainWorkTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      const skills = workType.workTypeSkills.map(wts => wts.skill.name);
      
      if (skillCount > 0) {
        finalWorkTypesWithSkills++;
        console.log(`✅ ${index + 1}. ${workType.label}: ${skillCount} skills`);
        console.log(`   📋 Skills: ${skills.join(', ')}`);
      } else {
        finalWorkTypesWithoutSkills++;
        console.log(`❌ ${index + 1}. ${workType.label}: NO SKILLS - STILL NEEDS MAPPING`);
      }
      console.log('');
    });

    console.log('🎯 FINAL RESULTS:');
    console.log(`✅ Work types WITH skills: ${finalWorkTypesWithSkills}/${finalSupplyChainWorkTypes.length}`);
    console.log(`❌ Work types WITHOUT skills: ${finalWorkTypesWithoutSkills}/${finalSupplyChainWorkTypes.length}`);
    console.log(`📈 Final coverage: ${finalSupplyChainWorkTypes.length > 0 ? ((finalWorkTypesWithSkills / finalSupplyChainWorkTypes.length) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (finalWorkTypesWithoutSkills === 0) {
      console.log('🎉 SUCCESS: ALL SUPPLY CHAIN WORK TYPES NOW HAVE SKILLS MAPPED!');
      console.log('✅ Supply Chain Management should be fully functional in the UI');
    } else {
      console.log(`⚠️  WARNING: ${finalWorkTypesWithoutSkills} work types still need skill mapping`);
      console.log('❌ Supply Chain Management may have missing functionality');
    }

  } catch (error) {
    console.error('❌ Error fixing Supply Chain skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixSupplyChainSkillMappings()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });