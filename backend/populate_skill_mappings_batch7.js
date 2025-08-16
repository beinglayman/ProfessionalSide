const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch7() {
  try {
    console.log('🔄 Starting Batch 7: Product Management Focus Area Foundation...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for foundational Product Management work types
    const skillMappings = [
      // PRODUCT STRATEGY - Core strategic work
      {
        workTypeId: 'product-management-strategy-product-vision',
        skillNames: ['Product Strategy', 'Strategic Planning', 'Product Management', 'Vision Development']
      },
      {
        workTypeId: 'product-management-strategy-roadmap-planning',
        skillNames: ['Roadmap Planning', 'Product Strategy', 'Strategic Planning', 'Product Management']
      },
      {
        workTypeId: 'product-management-strategy-market-research',
        skillNames: ['Market Research', 'Competitive Analysis', 'Product Strategy', 'User Research']
      },
      {
        workTypeId: 'product-management-strategy-competitive-analysis',
        skillNames: ['Competitive Analysis', 'Market Research', 'Strategic Analysis', 'Product Strategy']
      },
      {
        workTypeId: 'product-management-strategy-go-to-market',
        skillNames: ['Go-to-Market Strategy', 'Product Strategy', 'Marketing Strategy', 'Launch Planning']
      },
      {
        workTypeId: 'product-management-strategy-feature-prioritization',
        skillNames: ['Feature Prioritization', 'Product Strategy', 'Product Management', 'Decision Making']
      },
      {
        workTypeId: 'product-management-strategy-product-positioning',
        skillNames: ['Product Positioning', 'Product Strategy', 'Market Research', 'Competitive Analysis']
      },
      {
        workTypeId: 'product-management-strategy-resource-allocation',
        skillNames: ['Resource Planning', 'Product Strategy', 'Project Management', 'Strategic Planning']
      },

      // PRODUCT ANALYTICS - Data-driven decisions
      {
        workTypeId: 'pm-analytics-product-metrics',
        skillNames: ['Product Analytics', 'Data Analysis', 'KPI Development', 'Metrics Tracking']
      },
      {
        workTypeId: 'pm-analytics-ab-testing',
        skillNames: ['A/B Testing', 'Product Analytics', 'Statistical Analysis', 'Experimentation']
      },
      {
        workTypeId: 'pm-analytics-user-behavior',
        skillNames: ['User Behavior Analysis', 'Product Analytics', 'Data Analysis', 'User Research']
      },
      {
        workTypeId: 'pm-analytics-funnel-analysis',
        skillNames: ['Funnel Analysis', 'Product Analytics', 'Conversion Optimization', 'Data Analysis']
      },
      {
        workTypeId: 'pm-analytics-retention',
        skillNames: ['Retention Analysis', 'Product Analytics', 'Cohort Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'pm-analytics-cohort-analysis',
        skillNames: ['Cohort Analysis', 'Product Analytics', 'Data Analysis', 'Customer Lifecycle']
      },
      {
        workTypeId: 'pm-analytics-dashboard',
        skillNames: ['Dashboard Development', 'Product Analytics', 'Data Visualization', 'KPI Tracking']
      },
      {
        workTypeId: 'pm-analytics-predictive',
        skillNames: ['Predictive Analytics', 'Product Analytics', 'Data Analysis', 'Machine Learning']
      },

      // PRODUCT DEVELOPMENT - Development coordination
      {
        workTypeId: 'pm-development-agile-management',
        skillNames: ['Agile Methodology', 'Product Management', 'Sprint Planning', 'Scrum']
      },
      {
        workTypeId: 'pm-development-sprint-planning',
        skillNames: ['Sprint Planning', 'Agile Methodology', 'Product Management', 'Backlog Management']
      },
      {
        workTypeId: 'pm-development-feature-development',
        skillNames: ['Feature Development', 'Product Management', 'Requirements Analysis', 'User Stories']
      },
      {
        workTypeId: 'pm-development-release-planning',
        skillNames: ['Release Planning', 'Product Management', 'Project Management', 'Risk Management']
      },
      {
        workTypeId: 'pm-development-cross-functional',
        skillNames: ['Cross-functional Leadership', 'Team Leadership', 'Product Management', 'Collaboration']
      },
      {
        workTypeId: 'pm-development-product-design',
        skillNames: ['Product Design Collaboration', 'User Experience Design', 'Product Management', 'Design Thinking']
      },
      {
        workTypeId: 'pm-development-quality-assurance',
        skillNames: ['Quality Assurance', 'Product Management', 'Testing Strategy', 'Risk Management']
      },
      {
        workTypeId: 'pm-development-technical-specification',
        skillNames: ['Technical Writing', 'Requirements Analysis', 'Product Management', 'System Design']
      },

      // PRODUCT DISCOVERY - User research and validation
      {
        workTypeId: 'product-management-discovery-customer-interviews',
        skillNames: ['User Research', 'Customer Interviews', 'Product Discovery', 'Research Methods']
      },
      {
        workTypeId: 'product-management-discovery-concept-validation',
        skillNames: ['User Research', 'Concept Validation', 'Product Discovery', 'User Testing']
      },
      {
        workTypeId: 'product-management-discovery-problem-validation',
        skillNames: ['User Research', 'Problem Validation', 'Product Discovery', 'Market Research']
      },
      {
        workTypeId: 'product-management-discovery-opportunity-assessment',
        skillNames: ['User Research', 'Market Research', 'Opportunity Assessment', 'Strategic Analysis']
      },
      {
        workTypeId: 'product-management-discovery-solution-exploration',
        skillNames: ['User Research', 'Solution Design', 'Product Discovery', 'Design Thinking']
      },
      {
        workTypeId: 'product-management-discovery-user-feedback-analysis',
        skillNames: ['User Research', 'Feedback Analysis', 'Product Discovery', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-discovery-prototype-testing',
        skillNames: ['Prototype Testing', 'User Testing', 'Product Discovery', 'User Research']
      },
      {
        workTypeId: 'product-management-discovery-design-sprints',
        skillNames: ['Design Sprints', 'Design Thinking', 'Product Discovery', 'Workshop Facilitation']
      },

      // PRODUCT EXECUTION - Delivery and coordination
      {
        workTypeId: 'product-management-execution-stakeholder-communication',
        skillNames: ['Stakeholder Management', 'Communication', 'Product Management', 'Presentation Skills']
      },
      {
        workTypeId: 'product-management-execution-cross-functional-coordination',
        skillNames: ['Cross-functional Coordination', 'Product Management', 'Project Management', 'Team Leadership']
      },
      {
        workTypeId: 'product-management-execution-sprint-planning',
        skillNames: ['Sprint Planning', 'Agile Methodology', 'Product Management', 'Backlog Management']
      },
      {
        workTypeId: 'product-management-execution-release-management',
        skillNames: ['Release Management', 'Product Management', 'Project Management', 'Risk Management']
      },
      {
        workTypeId: 'product-management-execution-decision-making',
        skillNames: ['Decision Making', 'Product Management', 'Strategic Thinking', 'Problem Solving']
      },
      {
        workTypeId: 'product-management-execution-development-support',
        skillNames: ['Development Support', 'Product Management', 'Technical Communication', 'Requirements Analysis']
      },
      {
        workTypeId: 'product-management-execution-qa-coordination',
        skillNames: ['QA Coordination', 'Quality Assurance', 'Product Management', 'Testing Strategy']
      },
      {
        workTypeId: 'product-management-execution-issue-triage',
        skillNames: ['Issue Triage', 'Problem Solving', 'Product Management', 'Priority Management']
      },

      // PRODUCT ANALYSIS - Core analytics
      {
        workTypeId: 'product-management-analysis-metrics-definition',
        skillNames: ['Product Analytics', 'Metrics Definition', 'KPI Development', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-ab-test-review',
        skillNames: ['A/B Testing', 'Product Analytics', 'Statistical Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-feature-performance-analysis',
        skillNames: ['Feature Analysis', 'Product Analytics', 'Performance Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-customer-feedback-analysis',
        skillNames: ['Customer Feedback Analysis', 'Product Analytics', 'User Research', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-competitive-analysis-detailed',
        skillNames: ['Competitive Analysis', 'Market Research', 'Strategic Analysis', 'Product Analytics']
      },
      {
        workTypeId: 'product-management-analysis-funnel-analysis',
        skillNames: ['Funnel Analysis', 'Product Analytics', 'Conversion Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-retention-analysis',
        skillNames: ['Retention Analysis', 'Product Analytics', 'Customer Lifecycle', 'Data Analysis']
      },
      {
        workTypeId: 'product-management-analysis-revenue-analysis',
        skillNames: ['Revenue Analysis', 'Product Analytics', 'Business Analysis', 'Financial Analysis']
      },

      // PRODUCT DOCUMENTATION - Communication and enablement
      {
        workTypeId: 'product-management-documentation-product-requirements-document',
        skillNames: ['Technical Writing', 'Requirements Documentation', 'Product Management', 'Systems Analysis']
      },
      {
        workTypeId: 'product-management-documentation-feature-announcements',
        skillNames: ['Product Communication', 'Technical Writing', 'Product Management', 'Marketing Communication']
      },
      {
        workTypeId: 'product-management-documentation-product-presentations',
        skillNames: ['Presentation Skills', 'Product Management', 'Communication', 'Visual Communication']
      },
      {
        workTypeId: 'product-management-documentation-sales-enablement-materials',
        skillNames: ['Sales Enablement', 'Product Management', 'Technical Writing', 'Marketing Materials']
      },
      {
        workTypeId: 'product-management-documentation-user-guides',
        skillNames: ['Technical Writing', 'User Documentation', 'Product Management', 'User Experience']
      },
      {
        workTypeId: 'product-management-documentation-internal-documentation',
        skillNames: ['Technical Writing', 'Documentation', 'Product Management', 'Knowledge Management']
      },
      {
        workTypeId: 'product-management-documentation-knowledge-base-articles',
        skillNames: ['Technical Writing', 'Knowledge Management', 'Product Management', 'Customer Support']
      },
      {
        workTypeId: 'product-management-documentation-product-videos',
        skillNames: ['Video Production', 'Product Communication', 'Content Creation', 'Product Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Product Management work type-skill mappings...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalMappingsSkipped = 0;
    let workTypesNotFound = 0;
    let skillsNotFound = 0;
    const missingSkills = new Set();
    const missingWorkTypes = new Set();

    for (const mapping of skillMappings) {
      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`❌ Work type not found: ${mapping.workTypeId}`);
        workTypesNotFound++;
        missingWorkTypes.add(mapping.workTypeId);
        continue;
      }

      console.log(`📌 Processing work type: ${workType.label}`);

      for (const skillName of mapping.skillNames) {
        // Find the skill by name (case-insensitive)
        const skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          console.log(`   ⚠️  Skill not found in database: "${skillName}"`);
          skillsNotFound++;
          missingSkills.add(skillName);
          continue;
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
          console.log(`   ⚠️  Mapping already exists: ${skillName}`);
          totalMappingsSkipped++;
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
        } catch (error) {
          console.log(`   ❌ Failed to add mapping for ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 BATCH 7 SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`⚠️  Skill mappings skipped (already exist): ${totalMappingsSkipped}`);
    console.log(`❌ Work types not found: ${workTypesNotFound}`);
    console.log(`❌ Skills not found in database: ${skillsNotFound}`);
    console.log('');

    if (missingSkills.size > 0) {
      console.log('🔍 Missing Skills Found:');
      Array.from(missingSkills).forEach(skill => {
        console.log(`   • ${skill}`);
      });
      console.log('');
    }

    if (missingWorkTypes.size > 0) {
      console.log('🔍 Missing Work Types Found:');
      Array.from(missingWorkTypes).forEach(workType => {
        console.log(`   • ${workType}`);
      });
      console.log('');
    }

    // Check updated Product Management focus area coverage
    console.log('🔍 Checking Updated Product Management Focus Area Coverage...');
    
    const productManagementFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Product Management',
          mode: 'insensitive'
        }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: true
              }
            }
          }
        }
      }
    });

    if (productManagementFocusArea) {
      let totalProductManagementWorkTypes = 0;
      let productManagementWorkTypesWithEnoughSkills = 0;

      productManagementFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalProductManagementWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            productManagementWorkTypesWithEnoughSkills++;
          }
        });
      });

      const productManagementCoveragePercentage = totalProductManagementWorkTypes > 0 ? 
        ((productManagementWorkTypesWithEnoughSkills / totalProductManagementWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Product Management Focus Area Coverage:`);
      console.log(`   Total work types: ${totalProductManagementWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${productManagementWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalProductManagementWorkTypes - productManagementWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${productManagementCoveragePercentage}%`);
      
      const improvement = parseFloat(productManagementCoveragePercentage) - 0;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 7 establishes Product Management focus area foundation.');
    console.log('   Targeting core strategy, analytics, development, and execution areas.');
    console.log('');
    console.log('✅ Batch 7 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch7()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });