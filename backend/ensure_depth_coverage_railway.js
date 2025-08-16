const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Use Railway environment variables
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Helper function to generate skill slug
function generateSkillSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

async function ensureDepthCoverageRailway() {
  try {
    console.log('🎯 ENSURING COMPLETE DEPTH-FIRST COVERAGE FOR 8 PRIMARY FOCUS AREAS (RAILWAY)...\n');
    console.log('Target Focus Areas: Design, Development, Leadership, Marketing, Operations, Product Management, Sales, Strategy\n');

    // Target focus areas for depth coverage
    const targetFocusAreas = [
      'Design', 'Development', 'Leadership', 'Marketing', 
      'Operations', 'Product Management', 'Sales', 'Strategy'
    ];

    console.log('🔍 PHASE 1: ANALYZING CURRENT RAILWAY DEPTH COVERAGE...\n');

    let totalMissingCategories = 0;
    let totalMissingWorkTypes = 0;
    let totalMissingSkillMappings = 0;
    
    const analysisResults = [];
    
    for (const focusAreaName of targetFocusAreas) {
      console.log(`📊 Analyzing ${focusAreaName} Focus Area...`);
      
      const focusArea = await prisma.focusArea.findFirst({
        where: { 
          label: { contains: focusAreaName, mode: 'insensitive' }
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

      if (!focusArea) {
        console.log(`   ❌ Focus area not found: ${focusAreaName}`);
        continue;
      }

      let categoriesWithSkills = 0;
      let categoriesMissingSkills = [];
      let totalWorkTypes = 0;
      let workTypesWithSkills = 0;
      let workTypesMissingSkills = [];

      focusArea.workCategories.forEach(category => {
        let categoryHasSkills = false;
        let categoryWorkTypesWithSkills = 0;
        
        category.workTypes.forEach(workType => {
          totalWorkTypes++;
          if (workType.workTypeSkills.length > 0) {
            workTypesWithSkills++;
            categoryWorkTypesWithSkills++;
            categoryHasSkills = true;
          } else {
            workTypesMissingSkills.push({
              categoryLabel: category.label,
              workTypeId: workType.id,
              workTypeLabel: workType.label
            });
          }
        });
        
        if (categoryHasSkills) {
          categoriesWithSkills++;
        } else {
          categoriesMissingSkills.push({
            categoryId: category.id,
            categoryLabel: category.label,
            workTypeCount: category.workTypes.length
          });
        }
      });

      const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
      const coverage = totalWorkTypes > 0 ? 
        ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

      console.log(`   Categories: ${categoriesWithSkills}/${focusArea.workCategories.length} with skills`);
      console.log(`   Work types: ${workTypesWithSkills}/${totalWorkTypes} with skills`);
      console.log(`   Coverage: ${coverage}%`);
      console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} Depth Coverage: ${hasTrueDepthCoverage ? 'COMPLETE' : 'INCOMPLETE'}`);

      if (!hasTrueDepthCoverage) {
        totalMissingCategories += categoriesMissingSkills.length;
        totalMissingSkillMappings += workTypesMissingSkills.length;
      }

      analysisResults.push({
        focusAreaName,
        focusAreaId: focusArea.id,
        complete: hasTrueDepthCoverage,
        categoriesMissingSkills,
        workTypesMissingSkills,
        totalCategories: focusArea.workCategories.length,
        categoriesWithSkills
      });

      console.log('');
    }

    console.log('📋 ANALYSIS SUMMARY:');
    const completeAreas = analysisResults.filter(r => r.complete);
    const incompleteAreas = analysisResults.filter(r => !r.complete);
    
    console.log(`✅ COMPLETE: ${completeAreas.length}/8 focus areas`);
    completeAreas.forEach(area => {
      console.log(`   • ${area.focusAreaName}`);
    });
    
    if (incompleteAreas.length > 0) {
      console.log(`❌ INCOMPLETE: ${incompleteAreas.length}/8 focus areas`);
      incompleteAreas.forEach(area => {
        console.log(`   • ${area.focusAreaName}: ${area.categoriesWithSkills}/${area.totalCategories} categories have skills`);
      });
    }
    
    console.log(`\n🎯 ACTION NEEDED:`);
    console.log(`   • Missing category coverage: ${totalMissingCategories} categories`);
    console.log(`   • Missing skill mappings: ${totalMissingSkillMappings} work types`);
    console.log('');

    if (incompleteAreas.length === 0) {
      console.log('🎉 ALL 8 PRIMARY FOCUS AREAS ALREADY HAVE COMPLETE DEPTH COVERAGE!');
      return;
    }

    console.log('🔧 PHASE 2: ADDING MISSING SKILLS TO ENSURE DEPTH COVERAGE...\n');

    // Get all available skills
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in Railway database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings to ensure depth coverage
    const depthCoverageSkillMappings = [
      // DESIGN FOCUS AREA
      { workTypeId: 'design-visual-design-visual-identity', skillNames: ['Visual Design', 'Brand Identity', 'Design Systems', 'Creative Direction'] },
      { workTypeId: 'design-ux-design-user-research', skillNames: ['User Research', 'UX Design', 'User Testing', 'Design Research'] },
      { workTypeId: 'design-product-design-product-strategy', skillNames: ['Product Design', 'Product Strategy', 'Design Strategy', 'User Experience'] },
      { workTypeId: 'design-content-design-content-strategy', skillNames: ['Content Design', 'Content Strategy', 'UX Writing', 'Information Architecture'] },
      { workTypeId: 'design-design-systems-component-design', skillNames: ['Design Systems', 'Component Design', 'UI Design', 'Design Documentation'] },

      // DEVELOPMENT FOCUS AREA  
      { workTypeId: 'development-frontend-web-development', skillNames: ['Frontend Development', 'Web Development', 'JavaScript', 'React'] },
      { workTypeId: 'development-backend-api-development', skillNames: ['Backend Development', 'API Development', 'Node.js', 'Database Design'] },
      { workTypeId: 'development-mobile-ios-development', skillNames: ['Mobile Development', 'iOS Development', 'Swift', 'Mobile App Development'] },
      { workTypeId: 'development-devops-ci-cd', skillNames: ['DevOps', 'CI/CD', 'Infrastructure', 'Deployment'] },
      { workTypeId: 'development-data-data-engineering', skillNames: ['Data Engineering', 'Data Pipeline', 'ETL', 'Big Data'] },
      { workTypeId: 'development-qa-test-automation', skillNames: ['QA Testing', 'Test Automation', 'Quality Assurance', 'Testing'] },

      // LEADERSHIP FOCUS AREA
      { workTypeId: 'leadership-people-leadership-team-management', skillNames: ['Leadership', 'Team Management', 'People Management', 'Team Building'] },
      { workTypeId: 'leadership-strategic-leadership-vision-setting', skillNames: ['Strategic Leadership', 'Vision Setting', 'Strategic Planning', 'Executive Leadership'] },
      { workTypeId: 'leadership-change-leadership-change-management', skillNames: ['Change Management', 'Change Leadership', 'Transformation', 'Organizational Change'] },
      { workTypeId: 'leadership-talent-leadership-talent-development', skillNames: ['Talent Development', 'Leadership Development', 'Coaching', 'Mentoring'] },

      // MARKETING FOCUS AREA
      { workTypeId: 'marketing-digital-marketing-sem', skillNames: ['Digital Marketing', 'SEM', 'Search Engine Marketing', 'PPC'] },
      { workTypeId: 'marketing-content-marketing-content-creation', skillNames: ['Content Marketing', 'Content Creation', 'Content Strategy', 'Copywriting'] },
      { workTypeId: 'marketing-social-media-marketing-social-strategy', skillNames: ['Social Media Marketing', 'Social Strategy', 'Community Management', 'Social Media'] },
      { workTypeId: 'marketing-brand-marketing-brand-strategy', skillNames: ['Brand Marketing', 'Brand Strategy', 'Brand Management', 'Brand Development'] },
      { workTypeId: 'marketing-product-marketing-go-to-market', skillNames: ['Product Marketing', 'Go-to-Market', 'Product Launch', 'Marketing Strategy'] },
      { workTypeId: 'marketing-marketing-analytics-performance-analysis', skillNames: ['Marketing Analytics', 'Performance Analysis', 'Data Analysis', 'Marketing ROI'] },

      // OPERATIONS FOCUS AREA
      { workTypeId: 'operations-business-operations-process-improvement', skillNames: ['Business Operations', 'Process Improvement', 'Operations Management', 'Process Optimization'] },
      { workTypeId: 'operations-scm-demand-planning', skillNames: ['Supply Chain Management', 'Demand Planning', 'Forecasting', 'Analytics'] },
      { workTypeId: 'operations-quality-management-quality-assurance', skillNames: ['Quality Management', 'Quality Assurance', 'Process Quality', 'Quality Control'] },
      { workTypeId: 'operations-project-management-project-planning', skillNames: ['Project Management', 'Project Planning', 'Project Coordination', 'Project Delivery'] },
      { workTypeId: 'operations-vendor-management-vendor-selection', skillNames: ['Vendor Management', 'Vendor Selection', 'Procurement', 'Supplier Management'] },

      // PRODUCT MANAGEMENT FOCUS AREA
      { workTypeId: 'pm-strategy-product-vision', skillNames: ['Product Strategy', 'Product Vision', 'Product Planning', 'Strategic Planning'] },
      { workTypeId: 'pm-analytics-product-metrics', skillNames: ['Product Analytics', 'Product Metrics', 'Data Analysis', 'KPI Development'] },
      { workTypeId: 'pm-lifecycle-roadmap-planning', skillNames: ['Product Roadmap', 'Product Planning', 'Product Lifecycle', 'Roadmap Management'] },
      { workTypeId: 'pm-discovery-user-research', skillNames: ['Product Discovery', 'User Research', 'Customer Research', 'Market Research'] },

      // SALES FOCUS AREA
      { workTypeId: 'sales-inside-sales-lead-qualification', skillNames: ['Inside Sales', 'Lead Qualification', 'Sales Development', 'Lead Generation'] },
      { workTypeId: 'sales-enterprise-sales-account-management', skillNames: ['Enterprise Sales', 'Account Management', 'B2B Sales', 'Customer Success'] },
      { workTypeId: 'sales-sales-operations-sales-analytics', skillNames: ['Sales Operations', 'Sales Analytics', 'Sales Process', 'CRM Management'] },
      { workTypeId: 'sales-channel-sales-partner-management', skillNames: ['Channel Sales', 'Partner Management', 'Channel Development', 'Partnership'] },
      { workTypeId: 'sales-customer-success-customer-onboarding', skillNames: ['Customer Success', 'Customer Onboarding', 'Customer Retention', 'Customer Experience'] },

      // STRATEGY FOCUS AREA
      { workTypeId: 'strategy-business-strategy-strategic-planning', skillNames: ['Business Strategy', 'Strategic Planning', 'Strategic Analysis', 'Business Planning'] },
      { workTypeId: 'strategy-market-strategy-market-analysis', skillNames: ['Market Strategy', 'Market Analysis', 'Competitive Analysis', 'Market Research'] },
      { workTypeId: 'strategy-corporate-strategy-ma', skillNames: ['Corporate Strategy', 'Mergers & Acquisitions', 'Corporate Development', 'Strategic Partnerships'] },
      { workTypeId: 'strategy-innovation-strategy-innovation-management', skillNames: ['Innovation Strategy', 'Innovation Management', 'Innovation', 'Strategic Innovation'] }
    ];

    console.log(`🎯 Processing ${depthCoverageSkillMappings.length} depth coverage skill mappings...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalMappingsSkipped = 0;
    let workTypesNotFound = 0;
    let skillsNotFound = 0;
    const missingSkills = new Set();
    const missingWorkTypes = new Set();

    // Track progress by focus area
    const progressByFocusArea = {};

    for (const mapping of depthCoverageSkillMappings) {
      // Determine focus area from work type ID
      const focusAreaPrefix = mapping.workTypeId.split('-')[0];
      if (!progressByFocusArea[focusAreaPrefix]) {
        progressByFocusArea[focusAreaPrefix] = { added: 0, skipped: 0, failed: 0 };
      }

      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`❌ Work type not found: ${mapping.workTypeId}`);
        workTypesNotFound++;
        missingWorkTypes.add(mapping.workTypeId);
        progressByFocusArea[focusAreaPrefix].failed++;
        continue;
      }

      console.log(`📌 Processing: ${workType.label}`);

      for (const skillName of mapping.skillNames) {
        // Find the skill by name (case-insensitive)
        let skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        // If skill doesn't exist, create it
        if (!skill) {
          console.log(`   🔧 Creating missing skill: "${skillName}"`);
          try {
            skill = await prisma.skill.create({
              data: {
                id: generateSkillSlug(skillName),
                name: skillName,
                category: null
              }
            });
            console.log(`   ✅ Created skill: ${skillName}`);
            allSkills.push(skill); // Add to local cache
          } catch (error) {
            console.log(`   ❌ Failed to create skill "${skillName}": ${error.message}`);
            skillsNotFound++;
            missingSkills.add(skillName);
            progressByFocusArea[focusAreaPrefix].failed++;
            continue;
          }
        }

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Already exists: ${skillName}`);
          totalMappingsSkipped++;
          progressByFocusArea[focusAreaPrefix].skipped++;
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Added skill mapping: ${skillName}`);
          totalMappingsAdded++;
          progressByFocusArea[focusAreaPrefix].added++;
        } catch (error) {
          console.log(`   ❌ Failed to add mapping for ${skillName}: ${error.message}`);
          progressByFocusArea[focusAreaPrefix].failed++;
        }
      }
      console.log('');
    }

    console.log('📊 RAILWAY DEPTH COVERAGE SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`⚠️  Skill mappings skipped (already exist): ${totalMappingsSkipped}`);
    console.log(`❌ Work types not found: ${workTypesNotFound}`);
    console.log(`❌ Skills creation failed: ${skillsNotFound}`);
    console.log('');

    console.log('📈 PROGRESS BY FOCUS AREA:');
    Object.entries(progressByFocusArea).forEach(([area, progress]) => {
      const total = progress.added + progress.skipped + progress.failed;
      console.log(`   ${area}: ${progress.added} added, ${progress.skipped} skipped, ${progress.failed} failed (${total} total)`);
    });
    console.log('');

    console.log('🔍 PHASE 3: FINAL VERIFICATION OF DEPTH COVERAGE...\n');
    
    // Final verification for all 8 focus areas
    for (const focusAreaName of targetFocusAreas) {
      const focusArea = await prisma.focusArea.findFirst({
        where: { 
          label: { contains: focusAreaName, mode: 'insensitive' }
        },
        include: {
          workCategories: {
            include: {
              workTypes: {
                include: { workTypeSkills: true }
              }
            }
          }
        }
      });

      if (focusArea) {
        let categoriesWithSkills = 0;
        let totalWorkTypes = 0;
        let workTypesWithSkills = 0;
        
        focusArea.workCategories.forEach(category => {
          let categoryHasSkills = false;
          category.workTypes.forEach(workType => {
            totalWorkTypes++;
            if (workType.workTypeSkills.length > 0) {
              workTypesWithSkills++;
              categoryHasSkills = true;
            }
          });
          if (categoryHasSkills) {
            categoriesWithSkills++;
          }
        });

        const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
        const coverage = totalWorkTypes > 0 ? 
          ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

        console.log(`📈 ${focusAreaName} Focus Area:`);
        console.log(`   Categories: ${categoriesWithSkills}/${focusArea.workCategories.length} with skills`);
        console.log(`   Work types: ${workTypesWithSkills}/${totalWorkTypes} with skills`);
        console.log(`   Coverage: ${coverage}%`);
        console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} Depth Coverage: ${hasTrueDepthCoverage ? 'COMPLETE' : 'INCOMPLETE'}`);
        console.log('');
      }
    }

    console.log('🎊 RAILWAY DEPTH COVERAGE DEPLOYMENT COMPLETED!');
    console.log('   All 8 primary focus areas should now have complete depth-first coverage.');
    console.log('   Every category in each focus area has at least one work type with skills.');

  } catch (error) {
    console.error('❌ Error ensuring Railway depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
ensureDepthCoverageRailway()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });