const { PrismaClient } = require('@prisma/client');

// Use default Prisma client - Railway CLI will provide correct DATABASE_URL
const prisma = new PrismaClient();

async function fixSupplyChainRailway() {
  try {
    console.log('🔄 Fixing Supply Chain Work Types for Railway Database...\n');

    // Get all available skills
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Found ${allSkills.length} skills in database`);

    // Check if Supply Chain work types exist
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: 'operations-supply-chain'
      },
      include: {
        workTypeSkills: {
          include: { skill: true }
        }
      }
    });

    console.log(`📋 Found ${supplyChainWorkTypes.length} Supply Chain work types`);

    if (supplyChainWorkTypes.length === 0) {
      console.log('❌ No Supply Chain work types found. Need to create them first.');
      console.log('This suggests the reference data seeding may not have completed properly.');
      return;
    }

    // Add skills to Supply Chain work types
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

    console.log(`🎯 Processing ${skillMappings.length} work type skill mappings...`);

    let totalMappingsAdded = 0;
    let skillsNotFound = 0;

    for (const mapping of skillMappings) {
      // Check if work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`⚠️  Work type not found: ${mapping.workTypeId}`);
        continue;
      }

      console.log(`📌 Processing: ${workType.label}`);

      for (const skillName of mapping.skillNames) {
        // Find or create skill
        let skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          // Create missing skill
          try {
            const skillId = skillName
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
              .replace(/^-+|-+$/g, '');

            skill = await prisma.skill.create({
              data: {
                id: skillId,
                name: skillName
              }
            });
            allSkills.push(skill); // Add to cache
            console.log(`   🔧 Created skill: ${skillName}`);
          } catch (error) {
            console.log(`   ❌ Failed to create skill "${skillName}": ${error.message}`);
            skillsNotFound++;
            continue;
          }
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
    }

    console.log('\n📊 RAILWAY SUPPLY CHAIN FIX SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`❌ Skills not found: ${skillsNotFound}`);

    // Verify results
    const updatedSupplyChain = await prisma.workType.findMany({
      where: {
        workCategoryId: 'operations-supply-chain'
      },
      include: {
        workTypeSkills: {
          include: { skill: true }
        }
      }
    });

    console.log('\n✅ Updated Supply Chain Work Types:');
    updatedSupplyChain.forEach(wt => {
      const skillCount = wt.workTypeSkills.length;
      const skills = wt.workTypeSkills.map(wts => wts.skill.name).slice(0, 3).join(', ');
      console.log(`   • ${wt.label}: ${skillCount} skills${skillCount > 0 ? ` (${skills}${skillCount > 3 ? '...' : ''})` : ''}`);
    });

    console.log('\n🎉 Supply Chain fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing Supply Chain:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixSupplyChainRailway()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });