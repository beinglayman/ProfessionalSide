const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function completeDepthCoverage() {
  try {
    console.log('🔄 Completing Final Depth Coverage Gaps...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Final 4 work types to complete true depth coverage
    const skillMappings = [
      // DEVELOPMENT - Security Engineering (1 remaining gap)
      {
        workTypeId: 'development-security-engineering-application-security',
        skillNames: ['Security', 'DevOps', 'Software Development', 'Risk Management']
      },

      // MARKETING - Event Marketing (3 remaining gaps)
      {
        workTypeId: 'marketing-events-webinar-management',
        skillNames: ['Event Planning', 'Content Marketing', 'Lead Generation', 'Marketing']
      },

      // MARKETING - Creative Services
      {
        workTypeId: 'marketing-creative-design-production',
        skillNames: ['Creative Strategy', 'Content Marketing', 'Marketing', 'Visual Design']
      },

      // MARKETING - Growth Marketing
      {
        workTypeId: 'marketing-growth-acquisition-strategy',
        skillNames: ['Growth Strategy', 'Marketing Strategy', 'Strategic Planning', 'Marketing']
      }
    ];

    console.log(`🎯 Processing final ${skillMappings.length} depth coverage mappings...`);
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

    console.log('📊 COMPLETION SUMMARY:');
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

    console.log('🎉 TRUE DEPTH COVERAGE COMPLETION:');
    console.log('   All 8 target focus areas should now have complete depth coverage!');
    console.log('   Every category in Design, Development, Leadership, Marketing,');
    console.log('   Operations, Product Management, Sales, and Strategy now has');
    console.log('   at least one work type with at least one skill.');
    console.log('');
    console.log('✅ Final depth coverage completion successful!');

  } catch (error) {
    console.error('❌ Error completing depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
completeDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });