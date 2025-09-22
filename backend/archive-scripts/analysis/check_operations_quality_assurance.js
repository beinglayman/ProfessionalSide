const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkOperationsQualityAssurance() {
  try {
    console.log('🔍 CHECKING OPERATIONS > QUALITY ASSURANCE WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('');

    // Find Operations focus area
    const operationsFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: { contains: 'Operation', mode: 'insensitive' }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: {
                  include: { skill: true }
                }
              }
            }
          }
        }
      }
    });

    if (!operationsFocusArea) {
      console.log('❌ Operations focus area not found');
      return;
    }

    console.log(`✅ Found Operations focus area: ${operationsFocusArea.label} (${operationsFocusArea.id})`);
    console.log('');

    // Look for Quality Assurance category
    const qualityAssuranceCategories = operationsFocusArea.workCategories.filter(cat => 
      cat.label.toLowerCase().includes('quality') && 
      cat.label.toLowerCase().includes('assurance')
    );

    if (qualityAssuranceCategories.length === 0) {
      console.log('❌ No Quality Assurance category found in Operations');
      console.log('');
      console.log('📋 Available Operations categories:');
      operationsFocusArea.workCategories.forEach(cat => {
        console.log(`   • ${cat.label} (${cat.id})`);
      });
      return;
    }

    console.log(`✅ Found Quality Assurance categories: ${qualityAssuranceCategories.length}`);
    console.log('');

    qualityAssuranceCategories.forEach((category, index) => {
      console.log(`📊 Quality Assurance Category ${index + 1}: ${category.label} (${category.id})`);
      console.log(`📋 Work types: ${category.workTypes.length}`);
      console.log('');

      if (category.workTypes.length === 0) {
        console.log('   ❌ No work types found in this category');
      } else {
        console.log('   📋 Work types with skill mappings:');
        category.workTypes.forEach((workType, wtIndex) => {
          const skillCount = workType.workTypeSkills.length;
          const skills = workType.workTypeSkills.map(wts => wts.skill.name);
          
          console.log(`   ${wtIndex + 1}. ${workType.label} (${workType.id})`);
          console.log(`      📊 Skills: ${skillCount}`);
          if (skillCount > 0) {
            console.log(`      ✅ Mapped skills: ${skills.join(', ')}`);
          } else {
            console.log(`      ❌ No skills mapped`);
          }
          console.log('');
        });
      }
    });

    // Summary
    const totalWorkTypes = qualityAssuranceCategories.reduce((sum, cat) => sum + cat.workTypes.length, 0);
    const workTypesWithSkills = qualityAssuranceCategories.reduce((sum, cat) => 
      sum + cat.workTypes.filter(wt => wt.workTypeSkills.length > 0).length, 0);

    console.log('📈 OPERATIONS > QUALITY ASSURANCE SUMMARY:');
    console.log(`📊 Total work types: ${totalWorkTypes}`);
    console.log(`✅ Work types with skills: ${workTypesWithSkills}`);
    console.log(`❌ Work types without skills: ${totalWorkTypes - workTypesWithSkills}`);
    console.log(`📈 Coverage: ${totalWorkTypes > 0 ? ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error('❌ Error checking Operations Quality Assurance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationsQualityAssurance();