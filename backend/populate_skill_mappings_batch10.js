const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch10() {
  try {
    console.log('🔄 Starting Batch 10: Finance Focus Area Foundation...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for foundational Finance work types
    const skillMappings = [
      // ACCOUNTING - Core accounting operations
      {
        workTypeId: 'finance-accounting-accounting-systems',
        skillNames: ['Accounting Software', 'Financial Systems', 'Data Management', 'Process Improvement']
      },
      {
        workTypeId: 'finance-accounting-accounts-payable',
        skillNames: ['Accounts Payable', 'Financial Processing', 'Vendor Management', 'Invoice Processing']
      },
      {
        workTypeId: 'finance-accounting-accounts-receivable',
        skillNames: ['Accounts Receivable', 'Financial Processing', 'Customer Management', 'Collections']
      },
      {
        workTypeId: 'finance-accounting-financial-controls',
        skillNames: ['Financial Controls', 'Internal Controls', 'Compliance Management', 'Risk Management']
      },
      {
        workTypeId: 'finance-accounting-financial-reporting',
        skillNames: ['Financial Reporting', 'Financial Analysis', 'GAAP', 'Financial Statements']
      },
      {
        workTypeId: 'finance-accounting-general-ledger',
        skillNames: ['General Ledger', 'Chart of Accounts', 'Journal Entries', 'Financial Reconciliation']
      },
      {
        workTypeId: 'finance-accounting-month-end-close',
        skillNames: ['Month-end Close', 'Financial Reporting', 'Accounting Process', 'Financial Reconciliation']
      },

      // CORPORATE FINANCE - Strategic financial management
      {
        workTypeId: 'finance-corporate-finance-capital-structure',
        skillNames: ['Capital Structure', 'Financial Modeling', 'Debt Analysis', 'Equity Analysis']
      },
      {
        workTypeId: 'finance-corporate-finance-cash-flow-management',
        skillNames: ['Cash Flow Management', 'Liquidity Management', 'Working Capital', 'Financial Planning']
      },
      {
        workTypeId: 'finance-corporate-finance-financial-modeling',
        skillNames: ['Financial Modeling', 'Excel Modeling', 'Financial Analysis', 'Valuation']
      },
      {
        workTypeId: 'finance-corporate-finance-debt-management',
        skillNames: ['Debt Management', 'Credit Analysis', 'Interest Rate Analysis', 'Financial Risk']
      },
      {
        workTypeId: 'finance-corporate-finance-working-capital',
        skillNames: ['Working Capital', 'Cash Flow Management', 'Liquidity Analysis', 'Financial Optimization']
      },

      // FINANCIAL PLANNING & ANALYSIS - FP&A core functions
      {
        workTypeId: 'finance-fpa-budget-planning',
        skillNames: ['Budget Planning', 'Financial Planning', 'Financial Forecasting', 'Budget Management']
      },
      {
        workTypeId: 'finance-fpa-business-case',
        skillNames: ['Business Case Development', 'Financial Analysis', 'Investment Analysis', 'Strategic Analysis']
      },
      {
        workTypeId: 'finance-fpa-forecasting',
        skillNames: ['Financial Forecasting', 'Predictive Analytics', 'Statistical Analysis', 'Financial Modeling']
      },
      {
        workTypeId: 'finance-fpa-kpi-tracking',
        skillNames: ['KPI Tracking', 'Performance Analysis', 'Financial Analytics', 'Business Intelligence']
      },
      {
        workTypeId: 'finance-fpa-monthly-reporting',
        skillNames: ['Financial Reporting', 'Management Reporting', 'Financial Analysis', 'Data Visualization']
      },
      {
        workTypeId: 'finance-fpa-scenario-planning',
        skillNames: ['Scenario Planning', 'Financial Modeling', 'Risk Analysis', 'Strategic Planning']
      },
      {
        workTypeId: 'finance-fpa-strategic-analysis',
        skillNames: ['Strategic Analysis', 'Financial Analysis', 'Business Analysis', 'Financial Planning']
      },
      {
        workTypeId: 'finance-fpa-variance-analysis',
        skillNames: ['Variance Analysis', 'Performance Analysis', 'Budget Analysis', 'Financial Analysis']
      },

      // FINANCIAL REPORTING - External and internal reporting
      {
        workTypeId: 'finance-reporting-annual-reports',
        skillNames: ['Annual Reports', 'Financial Reporting', 'SEC Reporting', 'Technical Writing']
      },
      {
        workTypeId: 'finance-reporting-audit-support',
        skillNames: ['Audit Support', 'Documentation', 'Internal Controls', 'Financial Analysis']
      },
      {
        workTypeId: 'finance-reporting-board-presentations',
        skillNames: ['Board Presentations', 'Executive Communication', 'Presentation Skills', 'Financial Analysis']
      },
      {
        workTypeId: 'finance-reporting-gaap-compliance',
        skillNames: ['GAAP', 'Financial Reporting', 'Accounting Standards', 'Compliance Management']
      },
      {
        workTypeId: 'finance-reporting-management-reporting',
        skillNames: ['Management Reporting', 'Financial Reporting', 'Business Intelligence', 'Executive Communication']
      },
      {
        workTypeId: 'finance-reporting-monthly-close',
        skillNames: ['Month-end Close', 'Financial Reporting', 'Accounting Process', 'Financial Controls']
      },

      // INVESTMENT ANALYSIS - Capital allocation and evaluation
      {
        workTypeId: 'finance-investment-capital-budgeting',
        skillNames: ['Capital Budgeting', 'Investment Analysis', 'NPV Analysis', 'Project Evaluation']
      },
      {
        workTypeId: 'finance-investment-due-diligence',
        skillNames: ['Due Diligence', 'Investment Analysis', 'Risk Assessment', 'Financial Analysis']
      },
      {
        workTypeId: 'finance-investment-npv-irr',
        skillNames: ['NPV Analysis', 'IRR Analysis', 'Investment Analysis', 'Financial Modeling']
      },
      {
        workTypeId: 'finance-investment-roi-analysis',
        skillNames: ['ROI Analysis', 'Investment Analysis', 'Performance Analysis', 'Financial Modeling']
      },
      {
        workTypeId: 'finance-investment-project-evaluation',
        skillNames: ['Project Evaluation', 'Investment Analysis', 'Financial Analysis', 'Risk Assessment']
      },

      // INVESTOR RELATIONS - Stakeholder communication
      {
        workTypeId: 'finance-ir-analyst-meetings',
        skillNames: ['Investor Relations', 'Analyst Relations', 'Financial Presentations', 'Communication']
      },
      {
        workTypeId: 'finance-ir-earnings-calls',
        skillNames: ['Earnings Calls', 'Investor Relations', 'Financial Presentations', 'Public Speaking']
      },
      {
        workTypeId: 'finance-ir-investor-presentations',
        skillNames: ['Investor Presentations', 'Financial Presentations', 'Presentation Skills', 'Investor Relations']
      },
      {
        workTypeId: 'finance-ir-sec-filings',
        skillNames: ['SEC Filings', 'Regulatory Compliance', 'Financial Reporting', 'Legal Compliance']
      },

      // MERGERS & ACQUISITIONS - M&A transactions
      {
        workTypeId: 'finance-ma-deal-structuring',
        skillNames: ['Deal Structuring', 'M&A Analysis', 'Financial Modeling', 'Transaction Analysis']
      },
      {
        workTypeId: 'finance-ma-due-diligence',
        skillNames: ['M&A Due Diligence', 'Financial Analysis', 'Risk Assessment', 'Valuation']
      },
      {
        workTypeId: 'finance-ma-valuation-modeling',
        skillNames: ['Valuation Modeling', 'Financial Modeling', 'M&A Analysis', 'DCF Analysis']
      },
      {
        workTypeId: 'finance-ma-synergy-analysis',
        skillNames: ['Synergy Analysis', 'M&A Analysis', 'Financial Analysis', 'Strategic Analysis']
      },

      // RISK MANAGEMENT - Financial risk assessment and control
      {
        workTypeId: 'finance-risk-assessment',
        skillNames: ['Risk Assessment', 'Financial Risk', 'Risk Analysis', 'Risk Management']
      },
      {
        workTypeId: 'finance-risk-credit-analysis',
        skillNames: ['Credit Analysis', 'Credit Risk', 'Financial Analysis', 'Risk Assessment']
      },
      {
        workTypeId: 'finance-risk-market-risk',
        skillNames: ['Market Risk', 'Risk Management', 'Financial Risk', 'Portfolio Risk']
      },
      {
        workTypeId: 'finance-risk-controls',
        skillNames: ['Risk Controls', 'Internal Controls', 'Risk Management', 'Compliance Management']
      },
      {
        workTypeId: 'finance-risk-reporting',
        skillNames: ['Risk Reporting', 'Risk Management', 'Financial Reporting', 'Compliance Reporting']
      },

      // TREASURY MANAGEMENT - Cash and liquidity management
      {
        workTypeId: 'finance-treasury-cash-management',
        skillNames: ['Cash Management', 'Treasury Management', 'Liquidity Management', 'Cash Flow']
      },
      {
        workTypeId: 'finance-treasury-banking-relations',
        skillNames: ['Banking Relations', 'Treasury Management', 'Relationship Management', 'Financial Services']
      },
      {
        workTypeId: 'finance-treasury-foreign-exchange',
        skillNames: ['Foreign Exchange', 'Currency Risk', 'Treasury Management', 'Hedging']
      },
      {
        workTypeId: 'finance-treasury-funding-strategies',
        skillNames: ['Funding Strategies', 'Capital Markets', 'Treasury Management', 'Debt Financing']
      },
      {
        workTypeId: 'finance-treasury-investment-management',
        skillNames: ['Investment Management', 'Treasury Management', 'Portfolio Management', 'Liquidity Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Finance work type-skill mappings...`);
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

    console.log('📊 BATCH 10 SUMMARY:');
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

    // Check updated Finance focus area coverage
    console.log('🔍 Checking Updated Finance Focus Area Coverage...');
    
    const financeFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Finance',
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

    if (financeFocusArea) {
      let totalFinanceWorkTypes = 0;
      let financeWorkTypesWithEnoughSkills = 0;

      financeFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalFinanceWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            financeWorkTypesWithEnoughSkills++;
          }
        });
      });

      const financeCoveragePercentage = totalFinanceWorkTypes > 0 ? 
        ((financeWorkTypesWithEnoughSkills / totalFinanceWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Finance Focus Area Coverage:`);
      console.log(`   Total work types: ${totalFinanceWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${financeWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalFinanceWorkTypes - financeWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${financeCoveragePercentage}%`);
      
      const improvement = parseFloat(financeCoveragePercentage) - 0;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 10 establishes Finance focus area foundation.');
    console.log('   Targeting accounting, corporate finance, FP&A, reporting, and treasury areas.');
    console.log('');
    console.log('✅ Batch 10 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch10()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });