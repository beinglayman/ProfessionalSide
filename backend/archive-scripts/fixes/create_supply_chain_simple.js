const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createSupplyChainSimple() {
  try {
    console.log('🏗️  SIMPLE SUPPLY CHAIN CREATION SCRIPT');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL);
    console.log('');

    // Step 1: Find Supply Chain category
    console.log('🔍 Finding Supply Chain category...');
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

    console.log(`✅ Found category: ${supplyChainCategory.id} - ${supplyChainCategory.label}`);

    // Step 2: Create basic work types (if they don't exist)
    console.log('\n🏗️  Creating Supply Chain work types...');
    const workTypes = [
      { id: 'operations-scm-procurement', label: 'Procurement Management' },
      { id: 'operations-scm-logistics', label: 'Logistics & Distribution' },
      { id: 'operations-scm-inventory', label: 'Inventory Management' },
      { id: 'operations-scm-planning', label: 'Demand Planning & Forecasting' }
    ];

    let workTypesCreated = 0;
    for (const workType of workTypes) {
      try {
        const created = await prisma.workType.upsert({
          where: { id: workType.id },
          update: {},
          create: {
            id: workType.id,
            label: workType.label,
            workCategoryId: supplyChainCategory.id
          }
        });
        console.log(`✅ Work type ready: ${created.label}`);
        workTypesCreated++;
      } catch (error) {
        console.log(`❌ Failed to create ${workType.label}: ${error.message}`);
      }
    }

    console.log(`\n📊 Work types created/verified: ${workTypesCreated}`);

    // Step 3: Create essential skills
    console.log('\n🎯 Creating essential Supply Chain skills...');
    const essentialSkills = [
      'Supply Chain Management',
      'Procurement',
      'Logistics',
      'Inventory Management',
      'Vendor Management'
    ];

    let skillsCreated = 0;
    const createdSkills = [];

    for (const skillName of essentialSkills) {
      try {
        const skillId = skillName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        const skill = await prisma.skill.upsert({
          where: { id: skillId },
          update: {},
          create: {
            id: skillId,
            name: skillName
          }
        });
        createdSkills.push(skill);
        console.log(`✅ Skill ready: ${skill.name}`);
        skillsCreated++;
      } catch (error) {
        console.log(`❌ Failed to create skill ${skillName}: ${error.message}`);
      }
    }

    console.log(`\n📊 Skills created/verified: ${skillsCreated}`);

    // Step 4: Create basic skill mappings
    console.log('\n🔗 Creating skill mappings...');
    let mappingsCreated = 0;

    // Simple mappings: each work type gets Supply Chain Management skill
    for (const workType of workTypes) {
      const scmSkill = createdSkills.find(s => s.name === 'Supply Chain Management');
      if (scmSkill) {
        try {
          await prisma.workTypeSkill.upsert({
            where: {
              workTypeId_skillId: {
                workTypeId: workType.id,
                skillId: scmSkill.id
              }
            },
            update: {},
            create: {
              workTypeId: workType.id,
              skillId: scmSkill.id
            }
          });
          console.log(`✅ Mapped: ${workType.label} → ${scmSkill.name}`);
          mappingsCreated++;
        } catch (error) {
          console.log(`❌ Failed mapping for ${workType.label}: ${error.message}`);
        }
      }
    }

    // Add specific skills to each work type
    const specificMappings = [
      { workTypeId: 'operations-scm-procurement', skillName: 'Procurement' },
      { workTypeId: 'operations-scm-logistics', skillName: 'Logistics' },
      { workTypeId: 'operations-scm-inventory', skillName: 'Inventory Management' },
      { workTypeId: 'operations-scm-procurement', skillName: 'Vendor Management' }
    ];

    for (const mapping of specificMappings) {
      const skill = createdSkills.find(s => s.name === mapping.skillName);
      if (skill) {
        try {
          await prisma.workTypeSkill.upsert({
            where: {
              workTypeId_skillId: {
                workTypeId: mapping.workTypeId,
                skillId: skill.id
              }
            },
            update: {},
            create: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          });
          console.log(`✅ Mapped: ${mapping.workTypeId} → ${skill.name}`);
          mappingsCreated++;
        } catch (error) {
          console.log(`❌ Failed specific mapping: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Skill mappings created: ${mappingsCreated}`);

    // Step 5: Verify results
    console.log('\n🔍 Verifying Supply Chain setup...');
    const finalWorkTypes = await prisma.workType.findMany({
      where: { workCategoryId: supplyChainCategory.id },
      include: { workTypeSkills: { include: { skill: true } } }
    });

    console.log(`✅ Final Supply Chain work types: ${finalWorkTypes.length}`);
    finalWorkTypes.forEach(wt => {
      const skills = wt.workTypeSkills.map(wts => wts.skill.name).join(', ');
      console.log(`   • ${wt.label}: ${wt.workTypeSkills.length} skills (${skills})`);
    });

    if (finalWorkTypes.length > 0) {
      console.log('\n🎉 SUCCESS: Supply Chain Management should now be visible in the UI!');
    } else {
      console.log('\n❌ FAILED: No Supply Chain work types were created');
    }

  } catch (error) {
    console.error('\n❌ SCRIPT FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
createSupplyChainSimple()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });