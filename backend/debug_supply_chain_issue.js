const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function debugSupplyChainIssue() {
  try {
    console.log('🔍 Debugging Operations > Supply Chain Management Issue...\n');

    // First, find the Operations focus area
    console.log('1. Finding Operations Focus Area...');
    const operationsFocusArea = await prisma.focusArea.findFirst({
      where: {
        label: {
          contains: 'Operations',
          mode: 'insensitive'
        }
      }
    });

    if (!operationsFocusArea) {
      console.log('❌ Operations focus area not found!');
      return;
    }

    console.log(`✅ Found Operations Focus Area: ${operationsFocusArea.label} (ID: ${operationsFocusArea.id})`);
    console.log('');

    // Find all work categories in Operations
    console.log('2. Finding all Work Categories in Operations...');
    const workCategories = await prisma.workCategory.findMany({
      where: {
        focusAreaId: operationsFocusArea.id
      },
      orderBy: { label: 'asc' }
    });

    console.log(`Found ${workCategories.length} work categories:`);
    workCategories.forEach((category, index) => {
      console.log(`   ${index + 1}. ${category.label} (ID: ${category.id})`);
    });
    console.log('');

    // Specifically look for Supply Chain Management category
    console.log('3. Looking for Supply Chain Management category...');
    const supplyChainCategory = workCategories.find(cat => 
      cat.label.toLowerCase().includes('supply chain')
    );

    if (!supplyChainCategory) {
      console.log('❌ Supply Chain Management category not found!');
      console.log('Available categories:');
      workCategories.forEach(cat => {
        console.log(`   • ${cat.label}`);
      });
      return;
    }

    console.log(`✅ Found Supply Chain Management: ${supplyChainCategory.label} (ID: ${supplyChainCategory.id})`);
    console.log('');

    // Find all work types in Supply Chain Management
    console.log('4. Finding Work Types in Supply Chain Management...');
    const workTypes = await prisma.workType.findMany({
      where: {
        workCategoryId: supplyChainCategory.id
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

    console.log(`Found ${workTypes.length} work types in Supply Chain Management:`);
    if (workTypes.length === 0) {
      console.log('❌ NO WORK TYPES FOUND in Supply Chain Management category!');
    } else {
      workTypes.forEach((workType, index) => {
        const skillCount = workType.workTypeSkills.length;
        const skillNames = workType.workTypeSkills.map(wts => wts.skill.name).join(', ');
        console.log(`   ${index + 1}. ${workType.label}`);
        console.log(`      ID: ${workType.id}`);
        console.log(`      Skills: ${skillCount} (${skillNames || 'none'})`);
        console.log('');
      });
    }

    // Check if there are work types with supply chain in their ID but different category
    console.log('5. Checking for work types with "scm" in ID across all categories...');
    const scmWorkTypes = await prisma.workType.findMany({
      where: {
        id: {
          contains: 'scm'
        }
      },
      include: {
        workCategory: {
          include: {
            focusArea: true
          }
        },
        workTypeSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    console.log(`Found ${scmWorkTypes.length} work types with "scm" in ID:`);
    scmWorkTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      console.log(`   ${index + 1}. ${workType.label}`);
      console.log(`      ID: ${workType.id}`);
      console.log(`      Category: ${workType.workCategory.label}`);
      console.log(`      Focus Area: ${workType.workCategory.focusArea.label}`);
      console.log(`      Skills: ${skillCount}`);
      console.log('');
    });

    // Check frontend data fetching pattern
    console.log('6. Simulating Frontend Data Fetch Pattern...');
    const frontendSimulation = await prisma.focusArea.findFirst({
      where: {
        label: {
          contains: 'Operations',
          mode: 'insensitive'
        }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              orderBy: { label: 'asc' }
            }
          },
          orderBy: { label: 'asc' }
        }
      }
    });

    if (frontendSimulation) {
      console.log('Frontend would see:');
      frontendSimulation.workCategories.forEach(category => {
        console.log(`📂 ${category.label} (${category.workTypes.length} work types)`);
        if (category.label.toLowerCase().includes('supply chain')) {
          category.workTypes.forEach(workType => {
            console.log(`   • ${workType.label} (ID: ${workType.id})`);
          });
        }
      });
    }

    console.log('');
    console.log('✅ Supply Chain debugging completed!');

  } catch (error) {
    console.error('❌ Error debugging supply chain issue:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
debugSupplyChainIssue()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });