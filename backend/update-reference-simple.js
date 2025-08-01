const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateReferenceSimple() {
  try {
    console.log('🔄 Starting simple reference structure update...');

    // 1. Add Product Documentation to Product Management
    console.log('📝 Adding Product Documentation to Product Management...');
    await prisma.workCategory.upsert({
      where: { id: 'pm-documentation' },
      update: {
        label: 'Product Documentation',
        focusAreaId: '03-product-management'
      },
      create: {
        id: 'pm-documentation',
        label: 'Product Documentation',
        focusAreaId: '03-product-management'
      }
    });

    // 2. Add work types for Product Documentation
    console.log('📋 Adding work types for Product Documentation...');
    const docWorkTypes = [
      { id: 'pm-documentation-01-requirements', label: 'Requirements Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-02-user-stories', label: 'User Stories & Acceptance Criteria', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-03-api-specs', label: 'API Specifications', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-04-feature-specs', label: 'Feature Specifications', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-05-user-guides', label: 'User Guides & Help Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-06-release-notes', label: 'Release Notes & Changelogs', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-07-process-docs', label: 'Process Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-99-others', label: 'Others', workCategoryId: 'pm-documentation' }
    ];

    for (const workType of docWorkTypes) {
      await prisma.workType.upsert({
        where: { id: workType.id },
        update: workType,
        create: workType
      });
    }

    // 3. Add skills for documentation
    console.log('🎯 Adding skills for documentation...');
    const docSkills = [
      { id: 'skill-technical-writing-doc', name: 'Technical Writing', category: 'Communication' },
      { id: 'skill-requirements-analysis-doc', name: 'Requirements Analysis', category: 'Analysis' },
      { id: 'skill-confluence-management', name: 'Confluence Management', category: 'Tools' },
      { id: 'skill-api-documentation-writing', name: 'API Documentation', category: 'Development' }
    ];

    for (const skill of docSkills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: skill,
        create: skill
      });
    }

    // 4. Add basic skill mappings
    console.log('🔗 Adding skill mappings...');
    const skillMappings = [
      // Requirements Documentation
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-technical-writing-doc' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-requirements-analysis-doc' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-user-stories' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-business-analysis' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-communication' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-critical-thinking' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-confluence-management' },

      // API Specifications
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-documentation-writing' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-technical-writing-doc' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-rest-api' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-graphql' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-postman' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-system-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-documentation' }
    ];

    for (const mapping of skillMappings) {
      await prisma.workTypeSkill.upsert({
        where: {
          workTypeId_skillId: {
            workTypeId: mapping.workTypeId,
            skillId: mapping.skillId
          }
        },
        update: {},
        create: mapping
      });
    }

    console.log('✅ Simple reference structure update completed!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error updating reference structure:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateReferenceSimple();