const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch9() {
  try {
    console.log('🔄 Starting Batch 9: Sales Focus Area Foundation...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for foundational Sales work types
    const skillMappings = [
      // ACCOUNT MANAGEMENT - Core account work
      {
        workTypeId: 'sales-account-management-account-health-monitoring',
        skillNames: ['Customer Relationship Management', 'Account Management', 'Data Analysis', 'Customer Success']
      },
      {
        workTypeId: 'sales-account-management-account-planning',
        skillNames: ['Strategic Planning', 'Account Management', 'Customer Relationship Management', 'Business Planning']
      },
      {
        workTypeId: 'sales-account-management-customer-meetings',
        skillNames: ['Customer Relationship Management', 'Presentation Skills', 'Communication', 'Meeting Management']
      },
      {
        workTypeId: 'sales-account-management-executive-relationship',
        skillNames: ['Executive Communication', 'Relationship Building', 'Stakeholder Management', 'Strategic Thinking']
      },
      {
        workTypeId: 'sales-account-management-relationship-building',
        skillNames: ['Relationship Building', 'Customer Relationship Management', 'Communication', 'Trust Building']
      },
      {
        workTypeId: 'sales-account-management-renewal-management',
        skillNames: ['Customer Retention', 'Contract Management', 'Negotiation', 'Customer Success']
      },
      {
        workTypeId: 'sales-account-management-upsell-cross-sell',
        skillNames: ['Upselling', 'Cross-selling', 'Customer Relationship Management', 'Revenue Growth']
      },

      // BUSINESS DEVELOPMENT - Strategic business growth
      {
        workTypeId: 'sales-bd-deal-structuring',
        skillNames: ['Deal Structuring', 'Financial Analysis', 'Negotiation', 'Contract Management']
      },
      {
        workTypeId: 'sales-bd-market-research',
        skillNames: ['Market Research', 'Competitive Analysis', 'Industry Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'sales-bd-market-expansion',
        skillNames: ['Market Expansion', 'Strategic Planning', 'Business Development', 'Go-to-Market Strategy']
      },
      {
        workTypeId: 'sales-bd-new-business-identification',
        skillNames: ['Business Development', 'Lead Generation', 'Market Research', 'Opportunity Assessment']
      },
      {
        workTypeId: 'sales-bd-partnership-development',
        skillNames: ['Partnership Development', 'Business Development', 'Negotiation', 'Relationship Building']
      },
      {
        workTypeId: 'sales-bd-revenue-growth',
        skillNames: ['Revenue Growth', 'Strategic Planning', 'Business Development', 'Sales Strategy']
      },
      {
        workTypeId: 'sales-bd-strategic-alliances',
        skillNames: ['Strategic Partnerships', 'Alliance Management', 'Business Development', 'Contract Management']
      },

      // CHANNEL PARTNERSHIPS - Channel management
      {
        workTypeId: 'sales-channel-partner-enablement',
        skillNames: ['Partner Enablement', 'Training Development', 'Channel Management', 'Sales Training']
      },
      {
        workTypeId: 'sales-channel-partner-recruitment',
        skillNames: ['Partner Recruitment', 'Channel Development', 'Business Development', 'Relationship Building']
      },
      {
        workTypeId: 'sales-channel-performance-management',
        skillNames: ['Performance Management', 'Channel Management', 'Analytics', 'Partner Management']
      },
      {
        workTypeId: 'sales-channel-program-development',
        skillNames: ['Program Development', 'Channel Strategy', 'Partner Management', 'Strategic Planning']
      },
      {
        workTypeId: 'sales-channel-training-programs',
        skillNames: ['Training Development', 'Sales Training', 'Partner Enablement', 'Program Management']
      },

      // CUSTOMER SUCCESS - Customer lifecycle management
      {
        workTypeId: 'sales-cs-customer-health-monitoring',
        skillNames: ['Customer Success', 'Data Analysis', 'Customer Health Metrics', 'Account Management']
      },
      {
        workTypeId: 'sales-cs-onboarding-management',
        skillNames: ['Customer Onboarding', 'Project Management', 'Customer Success', 'Training Development']
      },
      {
        workTypeId: 'sales-cs-relationship-management',
        skillNames: ['Customer Relationship Management', 'Customer Success', 'Account Management', 'Communication']
      },
      {
        workTypeId: 'sales-cs-renewal-management',
        skillNames: ['Customer Retention', 'Contract Management', 'Customer Success', 'Negotiation']
      },
      {
        workTypeId: 'sales-cs-retention-strategy',
        skillNames: ['Customer Retention', 'Customer Success', 'Strategic Planning', 'Relationship Building']
      },
      {
        workTypeId: 'sales-cs-expansion-revenue',
        skillNames: ['Revenue Expansion', 'Upselling', 'Customer Success', 'Account Growth']
      },

      // ENTERPRISE SALES - Complex sales
      {
        workTypeId: 'sales-enterprise-complex-deal-management',
        skillNames: ['Complex Sales', 'Deal Management', 'Enterprise Sales', 'Stakeholder Management']
      },
      {
        workTypeId: 'sales-enterprise-contract-negotiation',
        skillNames: ['Contract Negotiation', 'Enterprise Sales', 'Legal Negotiation', 'Deal Structuring']
      },
      {
        workTypeId: 'sales-enterprise-solution-selling',
        skillNames: ['Solution Selling', 'Enterprise Sales', 'Consultative Selling', 'Value Selling']
      },
      {
        workTypeId: 'sales-enterprise-stakeholder-mapping',
        skillNames: ['Stakeholder Management', 'Enterprise Sales', 'Relationship Mapping', 'Decision Maker Analysis']
      },
      {
        workTypeId: 'sales-enterprise-strategic-selling',
        skillNames: ['Strategic Selling', 'Enterprise Sales', 'Complex Sales', 'Sales Strategy']
      },

      // INSIDE SALES - Inside sales operations
      {
        workTypeId: 'sales-inside-crm-management',
        skillNames: ['CRM Management', 'Data Entry', 'Sales Operations', 'Database Management']
      },
      {
        workTypeId: 'sales-inside-lead-qualification',
        skillNames: ['Lead Qualification', 'Inside Sales', 'Sales Development', 'Customer Research']
      },
      {
        workTypeId: 'sales-inside-pipeline-management',
        skillNames: ['Pipeline Management', 'Sales Operations', 'Forecasting', 'CRM Management']
      },
      {
        workTypeId: 'sales-inside-phone-sales',
        skillNames: ['Phone Sales', 'Cold Calling', 'Inside Sales', 'Telephone Communication']
      },
      {
        workTypeId: 'sales-inside-virtual-demos',
        skillNames: ['Product Demonstrations', 'Virtual Presentations', 'Inside Sales', 'Remote Selling']
      },

      // OPPORTUNITY MANAGEMENT - Deal progression
      {
        workTypeId: 'sales-opportunity-management-closing-techniques',
        skillNames: ['Closing Techniques', 'Sales Closing', 'Negotiation', 'Deal Management']
      },
      {
        workTypeId: 'sales-opportunity-management-demo-presentations',
        skillNames: ['Product Demonstrations', 'Presentation Skills', 'Sales Presentations', 'Technical Demonstrations']
      },
      {
        workTypeId: 'sales-opportunity-management-discovery-calls',
        skillNames: ['Discovery Calls', 'Needs Analysis', 'Consultative Selling', 'Customer Research']
      },
      {
        workTypeId: 'sales-opportunity-management-negotiations',
        skillNames: ['Negotiation', 'Sales Negotiation', 'Deal Structuring', 'Contract Terms']
      },
      {
        workTypeId: 'sales-opportunity-management-objection-handling',
        skillNames: ['Objection Handling', 'Sales Skills', 'Persuasion', 'Problem Solving']
      },
      {
        workTypeId: 'sales-opportunity-management-proposal-development',
        skillNames: ['Proposal Writing', 'Technical Writing', 'Solution Design', 'Business Writing']
      },
      {
        workTypeId: 'sales-opportunity-management-value-proposition',
        skillNames: ['Value Proposition', 'Value Selling', 'Consultative Selling', 'ROI Analysis']
      },

      // SALES DEVELOPMENT - Lead generation and qualification
      {
        workTypeId: 'sales-sdr-appointment-setting',
        skillNames: ['Appointment Setting', 'Sales Development', 'Prospecting', 'Cold Calling']
      },
      {
        workTypeId: 'sales-sdr-lead-generation',
        skillNames: ['Lead Generation', 'Prospecting', 'Sales Development', 'Cold Outreach']
      },
      {
        workTypeId: 'sales-sdr-qualification-process',
        skillNames: ['Lead Qualification', 'Sales Development', 'Prospect Research', 'Needs Analysis']
      },
      {
        workTypeId: 'sales-sdr-outbound-campaigns',
        skillNames: ['Outbound Sales', 'Sales Campaigns', 'Cold Outreach', 'Email Marketing']
      },
      {
        workTypeId: 'sales-sdr-prospecting-strategy',
        skillNames: ['Sales Prospecting', 'Lead Generation', 'Sales Strategy', 'Target Market Analysis']
      },

      // SALES OPERATIONS - Sales support and analytics
      {
        workTypeId: 'sales-sales-operations-crm-management',
        skillNames: ['CRM Management', 'Sales Operations', 'Data Management', 'Process Optimization']
      },
      {
        workTypeId: 'sales-sales-operations-forecasting',
        skillNames: ['Sales Forecasting', 'Analytics', 'Pipeline Analysis', 'Revenue Forecasting']
      },
      {
        workTypeId: 'sales-sales-operations-sales-analytics',
        skillNames: ['Sales Analytics', 'Data Analysis', 'Performance Analysis', 'Business Intelligence']
      },
      {
        workTypeId: 'sales-sales-operations-sales-process-optimization',
        skillNames: ['Process Optimization', 'Sales Operations', 'Process Improvement', 'Workflow Optimization']
      },
      {
        workTypeId: 'sales-sales-operations-territory-management',
        skillNames: ['Territory Management', 'Sales Operations', 'Geographic Analysis', 'Resource Allocation']
      },

      // SALES PROSPECTING - Prospecting and outreach
      {
        workTypeId: 'sales-prospecting-account-research',
        skillNames: ['Account Research', 'Customer Research', 'Prospecting', 'Market Research']
      },
      {
        workTypeId: 'sales-prospecting-cold-calling',
        skillNames: ['Cold Calling', 'Phone Sales', 'Prospecting', 'Telephone Communication']
      },
      {
        workTypeId: 'sales-prospecting-lead-generation',
        skillNames: ['Lead Generation', 'Prospecting', 'Cold Outreach', 'Marketing Qualified Leads']
      },
      {
        workTypeId: 'sales-prospecting-lead-nurturing',
        skillNames: ['Lead Nurturing', 'Email Marketing', 'Customer Communication', 'Relationship Building']
      },
      {
        workTypeId: 'sales-prospecting-networking',
        skillNames: ['Networking', 'Relationship Building', 'Professional Networking', 'Industry Events']
      },
      {
        workTypeId: 'sales-prospecting-social-selling',
        skillNames: ['Social Selling', 'LinkedIn Sales', 'Social Media Marketing', 'Digital Prospecting']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Sales work type-skill mappings...`);
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

    console.log('📊 BATCH 9 SUMMARY:');
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

    // Check updated Sales focus area coverage
    console.log('🔍 Checking Updated Sales Focus Area Coverage...');
    
    const salesFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Sales',
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

    if (salesFocusArea) {
      let totalSalesWorkTypes = 0;
      let salesWorkTypesWithEnoughSkills = 0;

      salesFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalSalesWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            salesWorkTypesWithEnoughSkills++;
          }
        });
      });

      const salesCoveragePercentage = totalSalesWorkTypes > 0 ? 
        ((salesWorkTypesWithEnoughSkills / totalSalesWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Sales Focus Area Coverage:`);
      console.log(`   Total work types: ${totalSalesWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${salesWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalSalesWorkTypes - salesWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${salesCoveragePercentage}%`);
      
      const improvement = parseFloat(salesCoveragePercentage) - 0;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 9 establishes Sales focus area foundation.');
    console.log('   Targeting account management, business development, enterprise sales, and operations areas.');
    console.log('');
    console.log('✅ Batch 9 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch9()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });