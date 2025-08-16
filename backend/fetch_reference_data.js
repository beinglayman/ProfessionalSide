const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fetchAllReferenceData() {
  try {
    console.log('🔗 Connecting to Railway database...\n');

    // 1. Fetch all Focus Areas (Primary Focus Areas)
    console.log('📋 Fetching Focus Areas...');
    const focusAreas = await prisma.focusArea.findMany({
      orderBy: { label: 'asc' }
    });
    console.log(`Found ${focusAreas.length} focus areas:`);
    console.log(JSON.stringify(focusAreas.map(fa => ({ id: fa.id, label: fa.label, description: fa.description })), null, 2));
    console.log('\n');

    // 2. Fetch all Work Categories
    console.log('📂 Fetching Work Categories...');
    const workCategories = await prisma.workCategory.findMany({
      include: {
        focusArea: true
      },
      orderBy: { label: 'asc' }
    });
    console.log(`Found ${workCategories.length} work categories:`);
    console.log(JSON.stringify(workCategories.map(wc => ({ 
      id: wc.id, 
      label: wc.label, 
      focusAreaId: wc.focusAreaId,
      focusAreaLabel: wc.focusArea.label 
    })), null, 2));
    console.log('\n');

    // 3. Fetch all Work Types
    console.log('⚙️ Fetching Work Types...');
    const workTypes = await prisma.workType.findMany({
      include: {
        workCategory: {
          include: {
            focusArea: true
          }
        }
      },
      orderBy: { label: 'asc' }
    });
    console.log(`Found ${workTypes.length} work types:`);
    console.log(JSON.stringify(workTypes.map(wt => ({ 
      id: wt.id, 
      label: wt.label, 
      workCategoryId: wt.workCategoryId,
      workCategoryLabel: wt.workCategory.label,
      focusAreaLabel: wt.workCategory.focusArea.label
    })), null, 2));
    console.log('\n');

    // 4. Fetch all Skills
    console.log('🎯 Fetching Skills...');
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`Found ${skills.length} skills:`);
    console.log(JSON.stringify(skills.map(s => ({ 
      id: s.id, 
      name: s.name, 
      category: s.category 
    })), null, 2));
    console.log('\n');

    // 5. Fetch Work Type Skills relationships
    console.log('🔗 Fetching Work Type-Skill relationships...');
    const workTypeSkills = await prisma.workTypeSkill.findMany({
      include: {
        workType: {
          include: {
            workCategory: {
              include: {
                focusArea: true
              }
            }
          }
        },
        skill: true
      }
    });
    console.log(`Found ${workTypeSkills.length} work type-skill relationships:`);
    console.log(JSON.stringify(workTypeSkills.map(wts => ({
      workTypeId: wts.workTypeId,
      workTypeLabel: wts.workType.label,
      skillId: wts.skillId,
      skillName: wts.skill.name,
      workCategoryLabel: wts.workType.workCategory.label,
      focusAreaLabel: wts.workType.workCategory.focusArea.label
    })), null, 2));
    console.log('\n');

    // Summary arrays
    console.log('📊 SUMMARY - Arrays for easy consumption:');
    console.log('\n=== FOCUS AREAS ===');
    console.log(JSON.stringify(focusAreas.map(fa => fa.label), null, 2));
    
    console.log('\n=== WORK CATEGORIES ===');
    console.log(JSON.stringify(workCategories.map(wc => wc.label), null, 2));
    
    console.log('\n=== WORK TYPES ===');
    console.log(JSON.stringify(workTypes.map(wt => wt.label), null, 2));
    
    console.log('\n=== SKILLS ===');
    console.log(JSON.stringify(skills.map(s => s.name), null, 2));

    console.log('\n✅ Data fetch completed successfully!');

  } catch (error) {
    console.error('❌ Error fetching reference data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fetchAllReferenceData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });