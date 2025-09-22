const { PrismaClient } = require('@prisma/client');

// Get Railway DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('🔗 Using DATABASE_URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

// Create Prisma client with explicit Railway URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function fixSupplyChainDirect() {
  try {
    console.log('🔄 Fixing Supply Chain with Railway Database Direct Connection...\n');

    // Test connection first
    console.log('🧪 Testing database connection...');
    const skillCount = await prisma.skill.count();
    console.log(`✅ Connection successful! Found ${skillCount} skills in database\n`);

    // Get Supply Chain work category
    const supplyChainCategory = await prisma.workCategory.findFirst({
      where: {
        focusAreaId: 'operations',
        label: { contains: 'Supply Chain', mode: 'insensitive' }
      }
    });

    if (!supplyChainCategory) {
      console.log('❌ Supply Chain category not found');
      return;
    }

    console.log(`📋 Found Supply Chain category: ${supplyChainCategory.id}`);

    // Check if Supply Chain work types exist
    const supplyChainWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: supplyChainCategory.id
      },
      include: {
        workTypeSkills: {
          include: { skill: true }
        }
      }
    });

    console.log(`📋 Found ${supplyChainWorkTypes.length} Supply Chain work types`);

    if (supplyChainWorkTypes.length === 0) {
      console.log('❌ No Supply Chain work types found. Creating them...');
      
      // Create Supply Chain work types
      const workTypesToCreate = [
        { id: 'operations-scm-demand-planning', label: 'Demand Planning & Forecasting' },
        { id: 'operations-scm-inventory-management', label: 'Inventory Management' },
        { id: 'operations-scm-logistics', label: 'Logistics & Distribution' },
        { id: 'operations-scm-sourcing', label: 'Strategic Sourcing' },
        { id: 'operations-scm-supplier-management', label: 'Supplier Relationship Management' },
        { id: 'operations-scm-optimization', label: 'Supply Chain Optimization' },
        { id: 'operations-scm-risk-management', label: 'Supply Chain Risk Management' },
        { id: 'operations-scm-procurement', label: 'Procurement Management' }
      ];

      for (const workType of workTypesToCreate) {
        try {
          await prisma.workType.create({
            data: {
              id: workType.id,
              label: workType.label,
              workCategoryId: supplyChainCategory.id
            }
          });
          console.log(`✅ Created work type: ${workType.label}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`⚠️  Work type already exists: ${workType.label}`);
          } else {
            console.log(`❌ Failed to create work type ${workType.label}: ${error.message}`);
          }
        }
      }

      // Refresh the work types list
      const updatedWorkTypes = await prisma.workType.findMany({
        where: {
          workCategoryId: supplyChainCategory.id
        },
        include: {
          workTypeSkills: {
            include: { skill: true }
          }
        }
      });

      console.log(`📋 Now have ${updatedWorkTypes.length} Supply Chain work types\n`);
    }

    // Get all available skills
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills: ${allSkills.length}`);

    // Define skill mappings
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
      },
      {
        workTypeId: 'operations-scm-procurement',
        skillNames: ['Supply Chain Management', 'Procurement', 'Vendor Management', 'Contract Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} work type skill mappings...\n`);

    let totalMappingsAdded = 0;
    let skillsCreated = 0;

    for (const mapping of skillMappings) {
      console.log(`📌 Processing: ${mapping.workTypeId}`);

      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`   ⚠️  Work type not found: ${mapping.workTypeId}`);
        continue;
      }

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
            skillsCreated++;
            console.log(`   🔧 Created skill: ${skillName}`);
          } catch (error) {
            if (error.code === 'P2002') {
              // Skill already exists, try to find it again
              skill = await prisma.skill.findUnique({
                where: { name: skillName }
              });
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
    console.log(`✅ Skills created: ${skillsCreated}`);
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);

    // Final verification
    const finalWorkTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: supplyChainCategory.id
      },
      include: {
        workTypeSkills: {
          include: { skill: true }
        }
      }
    });

    console.log('\n✅ Final Supply Chain Work Types:');
    finalWorkTypes.forEach(wt => {
      const skillCount = wt.workTypeSkills.length;
      const skills = wt.workTypeSkills.map(wts => wts.skill.name).slice(0, 3).join(', ');
      console.log(`   • ${wt.label}: ${skillCount} skills${skillCount > 0 ? ` (${skills}${skillCount > 3 ? '...' : ''})` : ''}`);
    });

    console.log('\n🎉 Supply Chain fix completed successfully!');
    console.log('✅ Supply Chain work types should now be visible in the UI');

  } catch (error) {
    console.error('❌ Error fixing Supply Chain:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixSupplyChainDirect()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });