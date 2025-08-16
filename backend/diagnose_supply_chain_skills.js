const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function diagnoseSupplyChainSkills() {
  try {
    console.log('🔍 DETAILED DIAGNOSIS: SUPPLY CHAIN WORK TYPES AND SKILL MAPPINGS');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('');

    // Get Supply Chain work types with their skill mappings
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

    let workTypesWithSkills = 0;
    let workTypesWithoutSkills = 0;
    const unmappedWorkTypes = [];

    console.log('📊 DETAILED SUPPLY CHAIN WORK TYPE ANALYSIS:');
    console.log('');

    supplyChainWorkTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      const skills = workType.workTypeSkills.map(wts => wts.skill.name);
      
      if (skillCount > 0) {
        workTypesWithSkills++;
        console.log(`✅ ${index + 1}. ${workType.label} (${workType.id})`);
        console.log(`   📊 Skills (${skillCount}): ${skills.join(', ')}`);
      } else {
        workTypesWithoutSkills++;
        console.log(`❌ ${index + 1}. ${workType.label} (${workType.id})`);
        console.log(`   📊 Skills: NONE - NEEDS MAPPING`);
        unmappedWorkTypes.push(workType);
      }
      console.log('');
    });

    console.log('📈 SUPPLY CHAIN SUMMARY:');
    console.log(`✅ Work types WITH skills: ${workTypesWithSkills}`);
    console.log(`❌ Work types WITHOUT skills: ${workTypesWithoutSkills}`);
    console.log(`📊 Coverage: ${supplyChainWorkTypes.length > 0 ? ((workTypesWithSkills / supplyChainWorkTypes.length) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (unmappedWorkTypes.length === 0) {
      console.log('🎉 ALL SUPPLY CHAIN WORK TYPES HAVE SKILLS MAPPED!');
      return { needsMapping: false, unmappedWorkTypes: [] };
    } else {
      console.log(`⚠️  ${unmappedWorkTypes.length} work types need skill mapping:`);
      unmappedWorkTypes.forEach(wt => {
        console.log(`   • ${wt.label} (${wt.id})`);
      });
      console.log('');
      return { needsMapping: true, unmappedWorkTypes };
    }

  } catch (error) {
    console.error('❌ Error diagnosing Supply Chain skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute diagnosis
diagnoseSupplyChainSkills()
  .then(result => {
    if (result.needsMapping) {
      console.log('🎯 CONCLUSION: Supply Chain work types need skill mapping');
      process.exit(1); // Exit with error to indicate mapping needed
    } else {
      console.log('✅ CONCLUSION: All Supply Chain work types properly mapped');
      process.exit(0); // Exit successfully
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });