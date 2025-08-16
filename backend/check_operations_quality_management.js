const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkOperationsQualityManagement() {
  try {
    console.log('🔍 CHECKING OPERATIONS > QUALITY MANAGEMENT WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('');

    // Get Quality Management category in Operations
    const qualityManagementCategory = await prisma.workCategory.findFirst({
      where: {
        id: 'operations-quality-management'
      },
      include: {
        focusArea: true,
        workTypes: {
          include: {
            workTypeSkills: {
              include: { skill: true }
            }
          },
          orderBy: { label: 'asc' }
        }
      }
    });

    if (!qualityManagementCategory) {
      console.log('❌ Operations > Quality Management category not found');
      return;
    }

    console.log(`✅ Found: ${qualityManagementCategory.focusArea.label} > ${qualityManagementCategory.label}`);
    console.log(`📋 Work types: ${qualityManagementCategory.workTypes.length}`);
    console.log('');

    if (qualityManagementCategory.workTypes.length === 0) {
      console.log('❌ No work types found in Quality Management category');
      return;
    }

    console.log('📊 QUALITY MANAGEMENT WORK TYPES:');
    console.log('');

    qualityManagementCategory.workTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      const skills = workType.workTypeSkills.map(wts => wts.skill.name);
      
      console.log(`${index + 1}. ${workType.label}`);
      console.log(`   🆔 ID: ${workType.id}`);
      console.log(`   📊 Skills: ${skillCount}`);
      
      if (skillCount > 0) {
        console.log(`   ✅ Mapped skills: ${skills.join(', ')}`);
      } else {
        console.log(`   ❌ No skills mapped`);
      }
      console.log('');
    });

    // Summary
    const workTypesWithSkills = qualityManagementCategory.workTypes.filter(wt => wt.workTypeSkills.length > 0).length;
    const workTypesWithoutSkills = qualityManagementCategory.workTypes.length - workTypesWithSkills;

    console.log('📈 OPERATIONS > QUALITY MANAGEMENT SUMMARY:');
    console.log(`📊 Total work types: ${qualityManagementCategory.workTypes.length}`);
    console.log(`✅ Work types with skills: ${workTypesWithSkills}`);
    console.log(`❌ Work types without skills: ${workTypesWithoutSkills}`);
    console.log(`📈 Coverage: ${qualityManagementCategory.workTypes.length > 0 ? ((workTypesWithSkills / qualityManagementCategory.workTypes.length) * 100).toFixed(1) : 0}%`);

    if (workTypesWithSkills === qualityManagementCategory.workTypes.length) {
      console.log('🎉 All Quality Management work types have skills mapped!');
    } else {
      console.log('⚠️  Some Quality Management work types need skill mapping');
    }

  } catch (error) {
    console.error('❌ Error checking Operations Quality Management:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationsQualityManagement();