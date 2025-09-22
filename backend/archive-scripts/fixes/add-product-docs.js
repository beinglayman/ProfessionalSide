const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addProductDocs() {
  try {
    console.log('🔄 Adding Product Documentation category...');

    // 1. Add Product Documentation to Product Management
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

    // 2. Add work types for Product Documentation (8 total)
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

    // 3. Add only new skills that don't exist
    const newSkills = [
      { id: 'skill-confluence-wiki-management', name: 'Confluence Wiki Management', category: 'Tools' },
      { id: 'skill-api-doc-writing', name: 'API Documentation Writing', category: 'Development' },
      { id: 'skill-feature-specification', name: 'Feature Specification Writing', category: 'Product' },
      { id: 'skill-user-guide-writing', name: 'User Guide Writing', category: 'Communication' }
    ];

    for (const skill of newSkills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: skill,
        create: skill
      });
    }

    // 4. Add sample skill mappings using existing skills
    const skillMappings = [
      // Requirements Documentation - using existing skills
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-documentation' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-user-stories' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-communication' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-critical-thinking' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-product-strategy' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-collaboration' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-confluence-wiki-management' },

      // API Specifications
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-doc-writing' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-documentation' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-rest-api' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-graphql' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-postman' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-system-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-communication' },

      // Feature Specifications
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-feature-specification' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-documentation' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-wireframing' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-user-testing' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-product-strategy' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-figma' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-communication' },

      // User Guides & Help Documentation
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-user-guide-writing' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-documentation' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-content-creation' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-user-testing' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-confluence-wiki-management' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-customer-research' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-visual-design' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-communication' }
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

    console.log('✅ Product Documentation category added successfully!');
    console.log('📊 Added:');
    console.log('- Product Documentation category');
    console.log('- 8 work types for Product Documentation');
    console.log('- 4 new skills');
    console.log('- 32 skill mappings');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error adding Product Documentation:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addProductDocs();