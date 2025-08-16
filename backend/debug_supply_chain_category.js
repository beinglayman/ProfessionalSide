const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugSupplyChainCategory() {
  try {
    console.log('🔍 DEBUGGING SUPPLY CHAIN CATEGORY STRUCTURE\n');

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
    console.log(`📋 Categories: ${operationsFocusArea.workCategories.length}\n`);

    // Look for Supply Chain category
    const supplyChainCategories = operationsFocusArea.workCategories.filter(cat => 
      cat.label.toLowerCase().includes('supply') || 
      cat.label.toLowerCase().includes('chain')
    );

    console.log('🔍 Supply Chain-related categories:');
    supplyChainCategories.forEach(cat => {
      console.log(`   • ${cat.label} (${cat.id}) - ${cat.workTypes.length} work types`);
      
      if (cat.workTypes.length > 0) {
        console.log('     Work types:');
        cat.workTypes.forEach(wt => {
          const skillCount = wt.workTypeSkills.length;
          const skills = wt.workTypeSkills.map(wts => wts.skill.name).join(', ');
          console.log(`       - ${wt.label} (${wt.id}): ${skillCount} skills ${skills ? `(${skills})` : ''}`);
        });
      }
      console.log('');
    });

    // Show all categories in Operations
    console.log('📋 All Operations categories:');
    operationsFocusArea.workCategories.forEach(cat => {
      console.log(`   • ${cat.label} (${cat.id}) - ${cat.workTypes.length} work types`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSupplyChainCategory();