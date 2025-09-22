const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

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

async function completeDepthFirstCoverage() {
  try {
    console.log('🎯 COMPLETE DEPTH-FIRST COVERAGE FOR ALL 8 PRIMARY FOCUS AREAS');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL);
    console.log('');

    // Target focus areas for depth coverage
    const targetFocusAreas = [
      'Design', 'Development', 'Leadership', 'Marketing', 
      'Operations', 'Product Management', 'Sales', 'Strategy'
    ];

    console.log('🔍 PHASE 1: ANALYZING CURRENT DEPTH COVERAGE...\n');

    let totalCategoriesMissing = 0;
    let totalWorkTypesMissing = 0;
    let totalSkillMappingsMissing = 0;
    
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
      let workTypesMissingSkills = [];

      focusArea.workCategories.forEach(category => {
        let categoryHasSkills = false;
        
        category.workTypes.forEach(workType => {
          if (workType.workTypeSkills.length > 0) {
            categoryHasSkills = true;
          } else {
            workTypesMissingSkills.push({
              categoryId: category.id,
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
      
      console.log(`   Categories: ${categoriesWithSkills}/${focusArea.workCategories.length} with skills`);
      console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} Depth Coverage: ${hasTrueDepthCoverage ? 'COMPLETE' : 'INCOMPLETE'}`);

      if (!hasTrueDepthCoverage) {
        totalCategoriesMissing += categoriesMissingSkills.length;
        totalSkillMappingsMissing += workTypesMissingSkills.length;
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
    if (incompleteAreas.length > 0) {
      console.log(`❌ INCOMPLETE: ${incompleteAreas.length}/8 focus areas need work`);
      console.log(`   Categories missing skills: ${totalCategoriesMissing}`);
      console.log(`   Work types needing skills: ${totalSkillMappingsMissing}`);
    }
    console.log('');

    if (incompleteAreas.length === 0) {
      console.log('🎉 ALL 8 PRIMARY FOCUS AREAS ALREADY HAVE COMPLETE DEPTH COVERAGE!');
      return;
    }

    console.log('🔧 PHASE 2: CREATING MISSING SKILLS AND MAPPINGS...\n');

    // Get all existing skills for reference
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Starting with ${allSkills.length} existing skills`);

    // Comprehensive skill mappings to ensure depth coverage
    const depthCoverageSkillMappings = [
      // DESIGN FOCUS AREA
      { focusArea: 'Design', workTypePattern: 'design-visual', skillNames: ['Visual Design', 'Brand Identity', 'Design Systems', 'Creative Direction'] },
      { focusArea: 'Design', workTypePattern: 'design-ux', skillNames: ['User Research', 'UX Design', 'User Testing', 'Design Research'] },
      { focusArea: 'Design', workTypePattern: 'design-product', skillNames: ['Product Design', 'Product Strategy', 'Design Strategy', 'User Experience'] },
      { focusArea: 'Design', workTypePattern: 'design-content', skillNames: ['Content Design', 'Content Strategy', 'UX Writing', 'Information Architecture'] },
      { focusArea: 'Design', workTypePattern: 'design-collaboration', skillNames: ['Design Collaboration', 'Cross-functional Collaboration', 'Design Communication', 'Team Coordination'] },

      // DEVELOPMENT FOCUS AREA  
      { focusArea: 'Development', workTypePattern: 'development-frontend', skillNames: ['Frontend Development', 'Web Development', 'JavaScript', 'React'] },
      { focusArea: 'Development', workTypePattern: 'development-backend', skillNames: ['Backend Development', 'API Development', 'Node.js', 'Database Design'] },
      { focusArea: 'Development', workTypePattern: 'development-mobile', skillNames: ['Mobile Development', 'iOS Development', 'Swift', 'Mobile App Development'] },
      { focusArea: 'Development', workTypePattern: 'development-devops', skillNames: ['DevOps', 'CI/CD', 'Infrastructure', 'Deployment'] },
      { focusArea: 'Development', workTypePattern: 'development-data', skillNames: ['Data Engineering', 'Data Pipeline', 'ETL', 'Big Data'] },

      // LEADERSHIP FOCUS AREA
      { focusArea: 'Leadership', workTypePattern: 'leadership-people', skillNames: ['Leadership', 'Team Management', 'People Management', 'Team Building'] },
      { focusArea: 'Leadership', workTypePattern: 'leadership-strategic', skillNames: ['Strategic Leadership', 'Vision Setting', 'Strategic Planning', 'Executive Leadership'] },
      { focusArea: 'Leadership', workTypePattern: 'leadership-change', skillNames: ['Change Management', 'Change Leadership', 'Transformation', 'Organizational Change'] },
      { focusArea: 'Leadership', workTypePattern: 'leadership-talent', skillNames: ['Talent Development', 'Leadership Development', 'Coaching', 'Mentoring'] },

      // MARKETING FOCUS AREA
      { focusArea: 'Marketing', workTypePattern: 'marketing-digital', skillNames: ['Digital Marketing', 'SEM', 'Search Engine Marketing', 'PPC'] },
      { focusArea: 'Marketing', workTypePattern: 'marketing-content', skillNames: ['Content Marketing', 'Content Creation', 'Content Strategy', 'Copywriting'] },
      { focusArea: 'Marketing', workTypePattern: 'marketing-social', skillNames: ['Social Media Marketing', 'Social Strategy', 'Community Management', 'Social Media'] },
      { focusArea: 'Marketing', workTypePattern: 'marketing-brand', skillNames: ['Brand Marketing', 'Brand Strategy', 'Brand Management', 'Brand Development'] },
      { focusArea: 'Marketing', workTypePattern: 'marketing-product', skillNames: ['Product Marketing', 'Go-to-Market', 'Product Launch', 'Marketing Strategy'] },

      // OPERATIONS FOCUS AREA
      { focusArea: 'Operations', workTypePattern: 'operations-business', skillNames: ['Business Operations', 'Process Improvement', 'Operations Management', 'Process Optimization'] },
      { focusArea: 'Operations', workTypePattern: 'operations-scm', skillNames: ['Supply Chain Management', 'Logistics', 'Procurement', 'Vendor Management'] },
      { focusArea: 'Operations', workTypePattern: 'operations-quality', skillNames: ['Quality Management', 'Quality Assurance', 'Process Quality', 'Quality Control'] },
      { focusArea: 'Operations', workTypePattern: 'operations-project', skillNames: ['Project Management', 'Project Planning', 'Project Coordination', 'Project Delivery'] },

      // PRODUCT MANAGEMENT FOCUS AREA
      { focusArea: 'Product Management', workTypePattern: 'pm-strategy', skillNames: ['Product Strategy', 'Product Vision', 'Product Planning', 'Strategic Planning'] },
      { focusArea: 'Product Management', workTypePattern: 'pm-analytics', skillNames: ['Product Analytics', 'Product Metrics', 'Data Analysis', 'KPI Development'] },
      { focusArea: 'Product Management', workTypePattern: 'pm-lifecycle', skillNames: ['Product Roadmap', 'Product Planning', 'Product Lifecycle', 'Roadmap Management'] },
      { focusArea: 'Product Management', workTypePattern: 'pm-discovery', skillNames: ['Product Discovery', 'User Research', 'Customer Research', 'Market Research'] },

      // SALES FOCUS AREA
      { focusArea: 'Sales', workTypePattern: 'sales-inside', skillNames: ['Inside Sales', 'Lead Qualification', 'Sales Development', 'Lead Generation'] },
      { focusArea: 'Sales', workTypePattern: 'sales-enterprise', skillNames: ['Enterprise Sales', 'Account Management', 'B2B Sales', 'Customer Success'] },
      { focusArea: 'Sales', workTypePattern: 'sales-operations', skillNames: ['Sales Operations', 'Sales Analytics', 'Sales Process', 'CRM Management'] },
      { focusArea: 'Sales', workTypePattern: 'sales-channel', skillNames: ['Channel Sales', 'Partner Management', 'Channel Development', 'Partnership'] },

      // STRATEGY FOCUS AREA
      { focusArea: 'Strategy', workTypePattern: 'strategy-business', skillNames: ['Business Strategy', 'Strategic Planning', 'Strategic Analysis', 'Business Planning'] },
      { focusArea: 'Strategy', workTypePattern: 'strategy-market', skillNames: ['Market Strategy', 'Market Analysis', 'Competitive Analysis', 'Market Research'] },
      { focusArea: 'Strategy', workTypePattern: 'strategy-corporate', skillNames: ['Corporate Strategy', 'Mergers & Acquisitions', 'Corporate Development', 'Strategic Partnerships'] },
      { focusArea: 'Strategy', workTypePattern: 'strategy-innovation', skillNames: ['Innovation Strategy', 'Innovation Management', 'Innovation', 'Strategic Innovation'] }
    ];

    console.log(`🎯 Processing ${depthCoverageSkillMappings.length} depth coverage patterns...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalSkillsCreated = 0;
    let workTypesNotFound = 0;

    for (const pattern of depthCoverageSkillMappings) {
      console.log(`📌 Processing ${pattern.focusArea} (${pattern.workTypePattern})...`);

      // Find work types matching the pattern
      const matchingWorkTypes = await prisma.workType.findMany({
        where: {
          id: { contains: pattern.workTypePattern }
        },
        include: {
          workTypeSkills: true
        }
      });

      if (matchingWorkTypes.length === 0) {
        console.log(`   ⚠️  No work types found for pattern: ${pattern.workTypePattern}`);
        workTypesNotFound++;
        continue;
      }

      // Pick the first work type that has no skills (prioritize empty ones)
      let targetWorkType = matchingWorkTypes.find(wt => wt.workTypeSkills.length === 0);
      if (!targetWorkType) {
        targetWorkType = matchingWorkTypes[0]; // Fallback to first one
      }

      console.log(`   🎯 Target work type: ${targetWorkType.label}`);

      for (const skillName of pattern.skillNames) {
        // Find or create skill
        let skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          // Create missing skill
          try {
            const skillId = generateSkillSlug(skillName);
            skill = await prisma.skill.create({
              data: {
                id: skillId,
                name: skillName
              }
            });
            allSkills.push(skill); // Add to cache
            totalSkillsCreated++;
            console.log(`   🔧 Created skill: ${skillName}`);
          } catch (error) {
            if (error.code === 'P2002') {
              // Skill exists, try to find it
              skill = await prisma.skill.findFirst({
                where: { name: skillName }
              });
            } else {
              console.log(`   ❌ Failed to create skill "${skillName}": ${error.message}`);
              continue;
            }
          }
        }

        if (!skill) {
          console.log(`   ❌ Could not find or create skill: ${skillName}`);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: targetWorkType.id,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Already exists: ${skillName}`);
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: targetWorkType.id,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Added: ${skillName}`);
          totalMappingsAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add mapping for ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 DEPTH COVERAGE COMPLETION SUMMARY:');
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`❌ Work type patterns not found: ${workTypesNotFound}`);
    console.log('');

    console.log('🔍 PHASE 3: FINAL VERIFICATION OF DEPTH COVERAGE...\n');
    
    // Final verification for all 8 focus areas
    let finalCompleteAreas = 0;
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

        if (hasTrueDepthCoverage) {
          finalCompleteAreas++;
        }

        console.log(`📈 ${focusAreaName}: ${categoriesWithSkills}/${focusArea.workCategories.length} categories, ${coverage}% coverage ${hasTrueDepthCoverage ? '✅' : '❌'}`);
      }
    }

    console.log('');
    console.log('🎊 FINAL RESULTS:');
    console.log(`✅ Focus areas with complete depth coverage: ${finalCompleteAreas}/8`);
    console.log(`✅ Total skills in database: ${allSkills.length + totalSkillsCreated}`);
    console.log(`✅ Total skill mappings added: ${totalMappingsAdded}`);

    if (finalCompleteAreas === 8) {
      console.log('\n🎉 SUCCESS: ALL 8 PRIMARY FOCUS AREAS NOW HAVE COMPLETE DEPTH COVERAGE!');
      console.log('   Every focus area → every category → at least one work type → at least one skill');
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS: ${finalCompleteAreas}/8 focus areas have depth coverage`);
      console.log('   Some categories may still need additional work types or skills');
    }

  } catch (error) {
    console.error('❌ Error completing depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
completeDepthFirstCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });