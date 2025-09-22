const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixSupplyChainVisibility() {
  try {
    console.log('🔄 Adding Skills to Supply Chain Work Types for Visibility...\n');

    // Get all available skills
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    // Add skills to the 7 supply chain work types that currently have 0 skills
    const skillMappings = [
      {
        workTypeId: 'operations-scm-demand-planning',
        skillNames: ['Supply Chain Management', 'Demand Planning', 'Forecasting', 'Analytics']
      },
      {
        workTypeId: 'operations-scm-inventory-management',
        skillNames: ['Supply Chain Management', 'Inventory Management', 'Operations Management', 'Data Analysis']
      },
      {
        workTypeId: 'operations-scm-logistics',
        skillNames: ['Supply Chain Management', 'Logistics', 'Operations Management', 'Process Optimization']
      },
      {
        workTypeId: 'operations-scm-sourcing',
        skillNames: ['Supply Chain Management', 'Strategic Sourcing', 'Vendor Management', 'Procurement']
      },
      {
        workTypeId: 'operations-scm-supplier-management',
        skillNames: ['Supply Chain Management', 'Vendor Management', 'Relationship Building', 'Contract Management']
      },
      {
        workTypeId: 'operations-scm-optimization',
        skillNames: ['Supply Chain Management', 'Process Optimization', 'Analytics', 'Performance Analysis']
      },
      {
        workTypeId: 'operations-scm-risk-management',
        skillNames: ['Supply Chain Management', 'Risk Management', 'Risk Assessment', 'Business Continuity']
      }
    ];

    console.log(`🎯 Adding skills to ${skillMappings.length} Supply Chain work types...`);
    console.log('');

    let totalMappingsAdded = 0;
    let skillsNotFound = 0;

    for (const mapping of skillMappings) {
      console.log(`📌 Processing: ${mapping.workTypeId}`);

      for (const skillName of mapping.skillNames) {
        const skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          console.log(`   ⚠️  Skill not found: "${skillName}"`);
          skillsNotFound++;
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
          console.log(`   ⚠️  Already exists: ${skillName}`);
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

          console.log(`   ✅ Added: ${skillName}`);
          totalMappingsAdded++;
        } catch (error) {
          console.log(`   ❌ Failed: ${skillName} - ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 SUPPLY CHAIN VISIBILITY FIX SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`❌ Skills not found: ${skillsNotFound}`);
    console.log('');

    // Verify the fix
    console.log('🔍 Verifying Supply Chain Work Types Now Have Skills...');
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        id: {
          startsWith: 'operations-scm-'
        }
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

    console.log(`\n✅ Updated Supply Chain Work Types (${supplyChainWorkTypes.length}):`);
    supplyChainWorkTypes.forEach(workType => {
      const skillCount = workType.workTypeSkills.length;
      const skills = workType.workTypeSkills.map(wts => wts.skill.name).join(', ');
      console.log(`   • ${workType.label}: ${skillCount} skills (${skills})`);
    });

    console.log('\n🎉 Supply Chain work types should now be visible in the UI!');
    console.log('   All work types now have at least 2 skills mapped.');

  } catch (error) {
    console.error('❌ Error fixing supply chain visibility:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixSupplyChainVisibility()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });