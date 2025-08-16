const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function establishTrueDepthCoverage() {
  try {
    console.log('🔄 Establishing True Depth Coverage - One Work Type Per Missing Category...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Target one work type per missing category to establish depth coverage
    const skillMappings = [
      // DEVELOPMENT - 4 missing categories
      {
        workTypeId: 'development-security-engineering-application-security',
        skillNames: ['Application Security', 'Security Engineering', 'Cybersecurity', 'Vulnerability Assessment']
      },
      {
        workTypeId: 'development-platform-engineering-developer-platform-development',
        skillNames: ['Platform Engineering', 'Developer Tools', 'Infrastructure as Code', 'DevOps']
      },
      {
        workTypeId: 'development-testing-unit-testing',
        skillNames: ['Unit Testing', 'Test Automation', 'Software Testing', 'Quality Assurance']
      },
      {
        workTypeId: 'development-documentation-api-documentation',
        skillNames: ['API Documentation', 'Technical Writing', 'Documentation', 'Software Documentation']
      },

      // MARKETING - 11 missing categories (targeting key ones)
      {
        workTypeId: 'marketing-digital-paid-advertising',
        skillNames: ['Paid Advertising', 'Digital Marketing', 'Google Ads', 'Performance Marketing']
      },
      {
        workTypeId: 'marketing-performance-paid-search',
        skillNames: ['Performance Marketing', 'Paid Search', 'SEM', 'Google Ads']
      },
      {
        workTypeId: 'marketing-product-marketing-product-positioning',
        skillNames: ['Product Marketing', 'Product Positioning', 'Go-to-Market Strategy', 'Marketing Strategy']
      },
      {
        workTypeId: 'marketing-growth-experimentation',
        skillNames: ['Growth Marketing', 'Growth Experimentation', 'A/B Testing', 'Conversion Optimization']
      },
      {
        workTypeId: 'marketing-social-strategy',
        skillNames: ['Social Media Marketing', 'Social Media Strategy', 'Content Strategy', 'Community Management']
      },
      {
        workTypeId: 'marketing-seo-keyword-research',
        skillNames: ['SEO', 'Keyword Research', 'Search Engine Optimization', 'Technical SEO']
      },
      {
        workTypeId: 'marketing-analytics-data-analysis',
        skillNames: ['Marketing Analytics', 'Data Analysis', 'Marketing Attribution', 'Performance Analysis']
      },
      {
        workTypeId: 'marketing-strategy-campaign-planning',
        skillNames: ['Marketing Strategy', 'Campaign Planning', 'Strategic Planning', 'Marketing Planning']
      },
      {
        workTypeId: 'marketing-events-webinar-management',
        skillNames: ['Event Marketing', 'Webinar Management', 'Event Planning', 'Marketing Events']
      },
      {
        workTypeId: 'marketing-creative-design-production',
        skillNames: ['Creative Services', 'Marketing Design', 'Creative Production', 'Brand Design']
      },
      {
        workTypeId: 'marketing-growth-acquisition-strategy',
        skillNames: ['Growth Marketing', 'Customer Acquisition', 'Acquisition Strategy', 'Growth Strategy']
      },

      // OPERATIONS - 4 missing categories
      {
        workTypeId: 'operations-scm-procurement',
        skillNames: ['Procurement Management', 'Supply Chain Management', 'Vendor Management', 'Strategic Sourcing']
      },
      {
        workTypeId: 'operations-vendor-selection',
        skillNames: ['Vendor Management', 'Vendor Selection', 'Supplier Evaluation', 'Procurement']
      },
      {
        workTypeId: 'operations-risk-assessment',
        skillNames: ['Risk Assessment', 'Risk Management', 'Operational Risk', 'Business Risk']
      },
      {
        workTypeId: 'operations-quality-system-design',
        skillNames: ['Quality Management', 'Quality Systems', 'Process Design', 'Quality Assurance']
      },

      // PRODUCT MANAGEMENT - 9 missing categories (targeting key ones)
      {
        workTypeId: 'pm-strategy-vision-development',
        skillNames: ['Product Strategy', 'Product Vision', 'Strategic Planning', 'Product Management']
      },
      {
        workTypeId: 'pm-marketing-go-to-market',
        skillNames: ['Product Marketing', 'Go-to-Market Strategy', 'Product Launch', 'Marketing Strategy']
      },
      {
        workTypeId: 'pm-ops-process-optimization',
        skillNames: ['Product Operations', 'Process Optimization', 'Product Management', 'Operations Management']
      },
      {
        workTypeId: 'pm-research-user-interviews',
        skillNames: ['User Research', 'Customer Interviews', 'Research Methods', 'User Experience Research']
      },
      {
        workTypeId: 'pm-roadmap-strategic-planning',
        skillNames: ['Roadmap Planning', 'Product Roadmap', 'Strategic Planning', 'Product Strategy']
      },
      {
        workTypeId: 'pm-stakeholder-executive-communication',
        skillNames: ['Stakeholder Management', 'Executive Communication', 'Product Management', 'Communication']
      },
      {
        workTypeId: 'product-management-requirements-user-story-creation',
        skillNames: ['Requirements Analysis', 'User Stories', 'Product Requirements', 'Agile Methodology']
      },
      {
        workTypeId: 'product-management-customer-success-customer-onboarding',
        skillNames: ['Customer Success', 'Customer Onboarding', 'Product Adoption', 'Customer Experience']
      },
      {
        workTypeId: 'product-management-product-growth-growth-experiments',
        skillNames: ['Product Growth', 'Growth Experiments', 'A/B Testing', 'Product Analytics']
      },

      // LEADERSHIP - 8 missing categories
      {
        workTypeId: 'leadership-team-building',
        skillNames: ['Team Leadership', 'Team Building', 'People Management', 'Leadership']
      },
      {
        workTypeId: 'leadership-exec-vision-setting',
        skillNames: ['Executive Leadership', 'Vision Development', 'Strategic Leadership', 'Leadership']
      },
      {
        workTypeId: 'leadership-people-hiring',
        skillNames: ['People Management', 'Recruitment', 'Hiring', 'Talent Acquisition']
      },
      {
        workTypeId: 'leadership-change-strategy',
        skillNames: ['Change Management', 'Change Strategy', 'Organizational Change', 'Leadership']
      },
      {
        workTypeId: 'leadership-od-structure-design',
        skillNames: ['Organizational Development', 'Organizational Design', 'Structure Design', 'Leadership']
      },
      {
        workTypeId: 'leadership-strategic-planning',
        skillNames: ['Strategic Leadership', 'Strategic Planning', 'Leadership', 'Strategic Thinking']
      },
      {
        workTypeId: 'leadership-cross-team-coordination',
        skillNames: ['Cross-functional Leadership', 'Team Coordination', 'Cross-functional Collaboration', 'Leadership']
      },
      {
        workTypeId: 'leadership-crisis-planning',
        skillNames: ['Crisis Management', 'Crisis Planning', 'Emergency Management', 'Leadership']
      },

      // STRATEGY - 8 missing categories
      {
        workTypeId: 'strategy-business-strategic-planning',
        skillNames: ['Business Strategy', 'Strategic Planning', 'Strategic Analysis', 'Business Planning']
      },
      {
        workTypeId: 'strategy-cd-ma-strategy',
        skillNames: ['Corporate Development', 'M&A Strategy', 'Strategic Planning', 'Business Development']
      },
      {
        workTypeId: 'strategy-planning-long-term-planning',
        skillNames: ['Strategic Planning', 'Long-term Planning', 'Strategic Analysis', 'Business Strategy']
      },
      {
        workTypeId: 'strategy-market-research',
        skillNames: ['Market Analysis', 'Market Research', 'Strategic Analysis', 'Competitive Analysis']
      },
      {
        workTypeId: 'strategy-ci-competitor-analysis',
        skillNames: ['Competitive Intelligence', 'Competitive Analysis', 'Market Research', 'Strategic Analysis']
      },
      {
        workTypeId: 'strategy-bd-growth-strategy',
        skillNames: ['Business Development', 'Growth Strategy', 'Strategic Planning', 'Business Strategy']
      },
      {
        workTypeId: 'strategy-partnership-identification',
        skillNames: ['Partnership Strategy', 'Strategic Partnerships', 'Business Development', 'Strategic Planning']
      },
      {
        workTypeId: 'strategy-digital-strategy-development',
        skillNames: ['Digital Transformation', 'Digital Strategy', 'Strategic Planning', 'Change Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} depth coverage skill mappings...`);
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

    console.log('📊 TRUE DEPTH COVERAGE ESTABLISHMENT SUMMARY:');
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

    console.log('');
    console.log('ℹ️  This establishes true depth coverage by ensuring every category');
    console.log('   in each focus area has at least one work type with skills.');
    console.log('');
    console.log('✅ True depth coverage establishment completed!');

  } catch (error) {
    console.error('❌ Error establishing true depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
establishTrueDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });