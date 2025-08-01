const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateReferenceStructure() {
  try {
    console.log('🔄 Starting reference structure update...');

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

    // 2. Fix Others ordering in step 2 - Update IDs to ensure proper ordering
    console.log('🔄 Fixing Others ordering in work categories...');
    
    // Get all work categories that need Others at the bottom
    const categoriesWithOthers = [
      { focusAreaId: '01-development', othersId: 'dev-99-others' },
      { focusAreaId: '02-design', othersId: 'design-99-others' },
      { focusAreaId: '03-product-management', othersId: 'pm-99-others' },
      { focusAreaId: '04-system-architecture', othersId: 'arch-99-others' },
      { focusAreaId: '05-quality-assurance', othersId: 'qa-99-others' },
      { focusAreaId: '06-project-management', othersId: 'proj-99-others' },
      { focusAreaId: '07-executive', othersId: 'exec-99-others' },
      { focusAreaId: '99-others', othersId: 'other-99-others' }
    ];

    // Update Others categories to ensure they come last
    for (const category of categoriesWithOthers) {
      await prisma.workCategory.updateMany({
        where: { 
          focusAreaId: category.focusAreaId,
          label: 'Others'
        },
        data: { id: category.othersId }
      });
    }

    // 3. Ensure we have 8 work types for each work category
    console.log('🔢 Ensuring 8 work types for each work category...');

    const workTypesToAdd = [
      // Product Management > Product Documentation work types
      { id: 'pm-documentation-01-requirements', label: 'Requirements Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-02-user-stories', label: 'User Stories & Acceptance Criteria', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-03-api-specs', label: 'API Specifications', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-04-feature-specs', label: 'Feature Specifications', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-05-user-guides', label: 'User Guides & Help Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-06-release-notes', label: 'Release Notes & Changelogs', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-07-process-docs', label: 'Process Documentation', workCategoryId: 'pm-documentation' },
      { id: 'pm-documentation-99-others', label: 'Others', workCategoryId: 'pm-documentation' },

      // Complete Product Strategy work types (already has some)
      { id: 'pm-strategy-08-competitive-positioning', label: 'Competitive Positioning', workCategoryId: 'pm-strategy' },

      // Product Analysis work types
      { id: 'pm-analysis-01-user-research', label: 'User Research & Analysis', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-02-data-analysis', label: 'Product Data Analysis', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-03-market-research', label: 'Market Research', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-04-competitive-analysis', label: 'Competitive Analysis', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-05-user-feedback', label: 'User Feedback Analysis', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-06-metrics-analysis', label: 'Metrics & KPI Analysis', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-07-persona-development', label: 'User Persona Development', workCategoryId: 'pm-analysis' },
      { id: 'pm-analysis-99-others', label: 'Others', workCategoryId: 'pm-analysis' },

      // Product Planning work types
      { id: 'pm-planning-01-roadmap', label: 'Product Roadmap Planning', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-02-feature-planning', label: 'Feature Planning & Prioritization', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-03-release-planning', label: 'Release Planning', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-04-resource-planning', label: 'Resource Planning', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-05-sprint-planning', label: 'Sprint Planning', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-06-capacity-planning', label: 'Capacity Planning', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-07-backlog-management', label: 'Backlog Management', workCategoryId: 'pm-planning' },
      { id: 'pm-planning-99-others', label: 'Others', workCategoryId: 'pm-planning' },

      // Product Launch work types
      { id: 'pm-launch-01-go-to-market', label: 'Go-to-Market Strategy', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-02-launch-planning', label: 'Launch Planning & Execution', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-03-beta-testing', label: 'Beta Testing & Feedback', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-04-marketing-materials', label: 'Marketing Materials Creation', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-05-training-materials', label: 'Training Materials Development', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-06-launch-metrics', label: 'Launch Metrics & Tracking', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-07-post-launch-analysis', label: 'Post-Launch Analysis', workCategoryId: 'pm-launch' },
      { id: 'pm-launch-99-others', label: 'Others', workCategoryId: 'pm-launch' },

      // Product Marketing work types
      { id: 'pm-marketing-01-messaging', label: 'Product Messaging', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-02-positioning', label: 'Market Positioning', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-03-content-strategy', label: 'Content Strategy', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-04-campaign-planning', label: 'Campaign Planning', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-05-customer-stories', label: 'Customer Stories & Case Studies', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-06-competitive-intel', label: 'Competitive Intelligence', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-07-pricing-strategy', label: 'Pricing Strategy', workCategoryId: 'pm-marketing' },
      { id: 'pm-marketing-99-others', label: 'Others', workCategoryId: 'pm-marketing' },

      // Product Operations work types
      { id: 'pm-operations-01-process-improvement', label: 'Process Improvement', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-02-workflow-optimization', label: 'Workflow Optimization', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-03-tool-management', label: 'Tool Management & Integration', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-04-team-coordination', label: 'Team Coordination', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-05-stakeholder-management', label: 'Stakeholder Management', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-06-reporting-dashboards', label: 'Reporting & Dashboards', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-07-quality-assurance', label: 'Quality Assurance Processes', workCategoryId: 'pm-operations' },
      { id: 'pm-operations-99-others', label: 'Others', workCategoryId: 'pm-operations' },

      // Product Growth work types
      { id: 'pm-growth-01-user-acquisition', label: 'User Acquisition Strategy', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-02-retention-strategy', label: 'User Retention Strategy', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-03-engagement-optimization', label: 'Engagement Optimization', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-04-conversion-optimization', label: 'Conversion Optimization', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-05-ab-testing', label: 'A/B Testing & Experimentation', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-06-growth-metrics', label: 'Growth Metrics & Analytics', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-07-viral-features', label: 'Viral Features & Referrals', workCategoryId: 'pm-growth' },
      { id: 'pm-growth-99-others', label: 'Others', workCategoryId: 'pm-growth' },

      // Development Frontend - ensure 8 work types
      { id: 'dev-frontend-08-pwa-development', label: 'Progressive Web App Development', workCategoryId: 'dev-frontend' },

      // Development Backend - ensure 8 work types
      { id: 'dev-backend-08-monitoring', label: 'Monitoring & Logging', workCategoryId: 'dev-backend' },

      // UX Design - ensure 8 work types  
      { id: 'design-ux-08-design-systems', label: 'Design System Development', workCategoryId: 'design-ux' },

      // Quality Assurance Manual - ensure 8 work types
      { id: 'qa-manual-08-mobile-testing', label: 'Mobile Testing', workCategoryId: 'qa-manual' },

      // Executive Strategy - ensure 8 work types
      { id: 'exec-strategy-08-transformation', label: 'Organizational Transformation', workCategoryId: 'exec-strategy' },

      // Customer Service - ensure 8 work types
      { id: 'other-cs-08-escalation-management', label: 'Escalation Management', workCategoryId: 'other-cs' }
    ];

    // Add all work types
    for (const workType of workTypesToAdd) {
      await prisma.workType.upsert({
        where: { id: workType.id },
        update: workType,
        create: workType
      });
    }

    // 4. Add skills for Product Documentation work types
    console.log('🎯 Adding skills for Product Documentation work types...');
    
    const productDocSkills = [
      { id: 'skill-technical-writing-pm', name: 'Technical Writing for Product', category: 'Communication' },
      { id: 'skill-requirements-analysis-pm', name: 'Requirements Analysis', category: 'Analysis' },
      { id: 'skill-api-documentation-pm', name: 'API Documentation', category: 'Development' },
      { id: 'skill-process-documentation-pm', name: 'Process Documentation', category: 'Communication' },
      { id: 'skill-confluence-wiki', name: 'Confluence/Wiki Management', category: 'Tools' },
      { id: 'skill-information-architecture-doc', name: 'Information Architecture for Docs', category: 'Design' },
      { id: 'skill-business-analysis', name: 'Business Analysis', category: 'Analysis' },
      { id: 'skill-workflow-optimization', name: 'Workflow Optimization', category: 'Operations' }
    ];

    // Add skills
    for (const skill of productDocSkills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: skill,
        create: skill
      });
    }

    // 5. Add skill mappings for Product Documentation work types
    console.log('🔗 Adding skill mappings for Product Documentation...');
    
    const skillMappings = [
      // Requirements Documentation
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-requirements-analysis' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-user-story-writing' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-business-analysis' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-communication' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-critical-thinking' },
      { workTypeId: 'pm-documentation-01-requirements', skillId: 'skill-process-documentation' },

      // User Stories & Acceptance Criteria
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-user-story-writing' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-requirements-analysis' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-agile' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-scrum' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-ux-research' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-customer-research' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-communication' },
      { workTypeId: 'pm-documentation-02-user-stories', skillId: 'skill-collaboration' },

      // API Specifications
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-documentation' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-api-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-rest-api' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-graphql' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-postman' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-system-design' },
      { workTypeId: 'pm-documentation-03-api-specs', skillId: 'skill-documentation' },

      // Feature Specifications
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-requirements-analysis' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-wireframing' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-user-testing' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-product-strategy' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-figma' },
      { workTypeId: 'pm-documentation-04-feature-specs', skillId: 'skill-information-architecture-doc' },

      // User Guides & Help Documentation
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-content-strategy' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-user-testing' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-information-architecture-doc' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-confluence-wiki' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-customer-research' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-visual-design' },
      { workTypeId: 'pm-documentation-05-user-guides', skillId: 'skill-communication' },

      // Release Notes & Changelogs
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-content-strategy' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-product-marketing' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-communication' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-project-planning' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-git' },
      { workTypeId: 'pm-documentation-06-release-notes', skillId: 'skill-agile' },

      // Process Documentation
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-process-documentation' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-technical-writing' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-confluence-wiki' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-workflow-optimization' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-team-coordination' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-stakeholder-management' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-information-architecture-doc' },
      { workTypeId: 'pm-documentation-07-process-docs', skillId: 'skill-communication' }
    ];

    // Add skill mappings
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

    console.log('✅ Reference structure update completed successfully!');
    console.log('📊 Summary:');
    console.log('- Added Product Documentation category to Product Management');
    console.log('- Fixed Others ordering in all work categories');
    console.log('- Added 8 work types for Product Documentation');
    console.log('- Added additional work types for other categories');
    console.log('- Added 8 new skills for documentation work');
    console.log('- Added comprehensive skill mappings');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error updating reference structure:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateReferenceStructure();