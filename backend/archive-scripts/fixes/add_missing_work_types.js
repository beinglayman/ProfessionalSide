const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMissingWorkTypes() {
  try {
    console.log('🔄 Adding missing work types to work categories...\n');

    // Define comprehensive work types for each category that needs them
    const workTypesToAdd = [
      // FINANCE FOCUS AREA
      {
        categoryId: 'finance-corporate-finance',
        workTypes: [
          { id: 'finance-corporate-finance-capital-structure', label: 'Capital Structure Analysis' },
          { id: 'finance-corporate-finance-debt-management', label: 'Debt Management' },
          { id: 'finance-corporate-finance-equity-financing', label: 'Equity Financing' },
          { id: 'finance-corporate-finance-financial-modeling', label: 'Financial Modeling' },
          { id: 'finance-corporate-finance-cash-flow-management', label: 'Cash Flow Management' },
          { id: 'finance-corporate-finance-cost-of-capital', label: 'Cost of Capital Analysis' },
          { id: 'finance-corporate-finance-dividend-policy', label: 'Dividend Policy Planning' },
          { id: 'finance-corporate-finance-working-capital', label: 'Working Capital Management' }
        ]
      },
      {
        categoryId: 'finance-financial-planning-analysis',
        workTypes: [
          { id: 'finance-fpa-budget-planning', label: 'Budget Planning & Development' },
          { id: 'finance-fpa-variance-analysis', label: 'Variance Analysis' },
          { id: 'finance-fpa-forecasting', label: 'Financial Forecasting' },
          { id: 'finance-fpa-scenario-planning', label: 'Scenario Planning' },
          { id: 'finance-fpa-kpi-tracking', label: 'KPI Tracking & Analysis' },
          { id: 'finance-fpa-monthly-reporting', label: 'Monthly Financial Reporting' },
          { id: 'finance-fpa-strategic-analysis', label: 'Strategic Financial Analysis' },
          { id: 'finance-fpa-business-case', label: 'Business Case Development' }
        ]
      },
      {
        categoryId: 'finance-financial-reporting',
        workTypes: [
          { id: 'finance-reporting-monthly-close', label: 'Monthly Close Process' },
          { id: 'finance-reporting-quarterly-statements', label: 'Quarterly Financial Statements' },
          { id: 'finance-reporting-annual-reports', label: 'Annual Report Preparation' },
          { id: 'finance-reporting-management-reporting', label: 'Management Reporting' },
          { id: 'finance-reporting-regulatory-filing', label: 'Regulatory Filing Preparation' },
          { id: 'finance-reporting-gaap-compliance', label: 'GAAP Compliance Reporting' },
          { id: 'finance-reporting-audit-support', label: 'Audit Support & Documentation' },
          { id: 'finance-reporting-board-presentations', label: 'Board Financial Presentations' }
        ]
      },
      {
        categoryId: 'finance-investment-analysis',
        workTypes: [
          { id: 'finance-investment-project-evaluation', label: 'Project Investment Evaluation' },
          { id: 'finance-investment-roi-analysis', label: 'ROI Analysis' },
          { id: 'finance-investment-npv-irr', label: 'NPV & IRR Calculations' },
          { id: 'finance-investment-payback-analysis', label: 'Payback Period Analysis' },
          { id: 'finance-investment-sensitivity-analysis', label: 'Investment Sensitivity Analysis' },
          { id: 'finance-investment-capital-budgeting', label: 'Capital Budgeting' },
          { id: 'finance-investment-portfolio-analysis', label: 'Investment Portfolio Analysis' },
          { id: 'finance-investment-due-diligence', label: 'Investment Due Diligence' }
        ]
      },
      {
        categoryId: 'finance-investor-relations',
        workTypes: [
          { id: 'finance-ir-earnings-calls', label: 'Earnings Call Preparation' },
          { id: 'finance-ir-investor-presentations', label: 'Investor Presentations' },
          { id: 'finance-ir-analyst-meetings', label: 'Analyst Meeting Coordination' },
          { id: 'finance-ir-sec-filings', label: 'SEC Filing Management' },
          { id: 'finance-ir-shareholder-communications', label: 'Shareholder Communications' },
          { id: 'finance-ir-roadshow-planning', label: 'Investor Roadshow Planning' },
          { id: 'finance-ir-guidance-management', label: 'Financial Guidance Management' },
          { id: 'finance-ir-crisis-communications', label: 'IR Crisis Communications' }
        ]
      },
      {
        categoryId: 'finance-mergers-acquisitions',
        workTypes: [
          { id: 'finance-ma-target-identification', label: 'M&A Target Identification' },
          { id: 'finance-ma-valuation-modeling', label: 'M&A Valuation Modeling' },
          { id: 'finance-ma-due-diligence', label: 'M&A Due Diligence' },
          { id: 'finance-ma-deal-structuring', label: 'Deal Structuring' },
          { id: 'finance-ma-integration-planning', label: 'Post-Merger Integration Planning' },
          { id: 'finance-ma-synergy-analysis', label: 'Synergy Analysis' },
          { id: 'finance-ma-negotiation-support', label: 'M&A Negotiation Support' },
          { id: 'finance-ma-closing-coordination', label: 'Deal Closing Coordination' }
        ]
      },
      {
        categoryId: 'finance-risk-management',
        workTypes: [
          { id: 'finance-risk-assessment', label: 'Financial Risk Assessment' },
          { id: 'finance-risk-credit-analysis', label: 'Credit Risk Analysis' },
          { id: 'finance-risk-market-risk', label: 'Market Risk Management' },
          { id: 'finance-risk-liquidity-management', label: 'Liquidity Risk Management' },
          { id: 'finance-risk-hedging-strategies', label: 'Hedging Strategy Development' },
          { id: 'finance-risk-stress-testing', label: 'Financial Stress Testing' },
          { id: 'finance-risk-controls', label: 'Risk Control Implementation' },
          { id: 'finance-risk-reporting', label: 'Risk Reporting & Monitoring' }
        ]
      },
      {
        categoryId: 'finance-treasury-management',
        workTypes: [
          { id: 'finance-treasury-cash-management', label: 'Cash Management' },
          { id: 'finance-treasury-banking-relations', label: 'Banking Relationship Management' },
          { id: 'finance-treasury-foreign-exchange', label: 'Foreign Exchange Management' },
          { id: 'finance-treasury-investment-management', label: 'Short-term Investment Management' },
          { id: 'finance-treasury-funding-strategies', label: 'Funding Strategy Development' },
          { id: 'finance-treasury-interest-rate-risk', label: 'Interest Rate Risk Management' },
          { id: 'finance-treasury-payment-systems', label: 'Payment Systems Management' },
          { id: 'finance-treasury-compliance', label: 'Treasury Compliance & Controls' }
        ]
      },

      // HR FOCUS AREA
      {
        categoryId: 'hr-compensation-benefits',
        workTypes: [
          { id: 'hr-comp-salary-benchmarking', label: 'Salary Benchmarking' },
          { id: 'hr-comp-job-evaluation', label: 'Job Evaluation & Grading' },
          { id: 'hr-comp-incentive-design', label: 'Incentive Program Design' },
          { id: 'hr-comp-benefits-administration', label: 'Benefits Administration' },
          { id: 'hr-comp-equity-compensation', label: 'Equity Compensation Management' },
          { id: 'hr-comp-pay-equity-analysis', label: 'Pay Equity Analysis' },
          { id: 'hr-comp-total-rewards', label: 'Total Rewards Strategy' },
          { id: 'hr-comp-vendor-management', label: 'Benefits Vendor Management' }
        ]
      },
      {
        categoryId: 'hr-diversity-inclusion',
        workTypes: [
          { id: 'hr-dei-strategy-development', label: 'DEI Strategy Development' },
          { id: 'hr-dei-bias-training', label: 'Unconscious Bias Training' },
          { id: 'hr-dei-inclusive-recruiting', label: 'Inclusive Recruiting Practices' },
          { id: 'hr-dei-erg-support', label: 'Employee Resource Group Support' },
          { id: 'hr-dei-culture-assessment', label: 'Workplace Culture Assessment' },
          { id: 'hr-dei-mentorship-programs', label: 'Mentorship Program Development' },
          { id: 'hr-dei-metrics-reporting', label: 'DEI Metrics & Reporting' },
          { id: 'hr-dei-policy-development', label: 'Inclusive Policy Development' }
        ]
      },
      {
        categoryId: 'hr-employee-relations',
        workTypes: [
          { id: 'hr-er-conflict-resolution', label: 'Workplace Conflict Resolution' },
          { id: 'hr-er-grievance-handling', label: 'Grievance Handling' },
          { id: 'hr-er-investigation-management', label: 'Investigation Management' },
          { id: 'hr-er-disciplinary-actions', label: 'Disciplinary Action Management' },
          { id: 'hr-er-policy-interpretation', label: 'HR Policy Interpretation' },
          { id: 'hr-er-employee-counseling', label: 'Employee Counseling' },
          { id: 'hr-er-union-relations', label: 'Labor Union Relations' },
          { id: 'hr-er-workplace-mediation', label: 'Workplace Mediation' }
        ]
      },
      {
        categoryId: 'hr-hr-operations',
        workTypes: [
          { id: 'hr-ops-hris-management', label: 'HRIS System Management' },
          { id: 'hr-ops-data-analytics', label: 'HR Data Analytics' },
          { id: 'hr-ops-process-optimization', label: 'HR Process Optimization' },
          { id: 'hr-ops-compliance-tracking', label: 'HR Compliance Tracking' },
          { id: 'hr-ops-vendor-management', label: 'HR Vendor Management' },
          { id: 'hr-ops-metrics-reporting', label: 'HR Metrics & Reporting' },
          { id: 'hr-ops-workflow-automation', label: 'HR Workflow Automation' },
          { id: 'hr-ops-document-management', label: 'HR Document Management' }
        ]
      },
      {
        categoryId: 'hr-learning-development',
        workTypes: [
          { id: 'hr-ld-training-needs-analysis', label: 'Training Needs Analysis' },
          { id: 'hr-ld-curriculum-development', label: 'Learning Curriculum Development' },
          { id: 'hr-ld-leadership-development', label: 'Leadership Development Programs' },
          { id: 'hr-ld-skills-assessment', label: 'Skills Gap Assessment' },
          { id: 'hr-ld-onboarding-programs', label: 'Onboarding Program Design' },
          { id: 'hr-ld-career-development', label: 'Career Development Planning' },
          { id: 'hr-ld-training-delivery', label: 'Training Program Delivery' },
          { id: 'hr-ld-learning-evaluation', label: 'Learning Effectiveness Evaluation' }
        ]
      },
      {
        categoryId: 'hr-organizational-development',
        workTypes: [
          { id: 'hr-od-change-management', label: 'Organizational Change Management' },
          { id: 'hr-od-culture-transformation', label: 'Culture Transformation' },
          { id: 'hr-od-org-design', label: 'Organizational Design' },
          { id: 'hr-od-team-effectiveness', label: 'Team Effectiveness Programs' },
          { id: 'hr-od-succession-planning', label: 'Succession Planning' },
          { id: 'hr-od-talent-review', label: 'Talent Review Processes' },
          { id: 'hr-od-engagement-surveys', label: 'Employee Engagement Surveys' },
          { id: 'hr-od-leadership-assessment', label: 'Leadership Assessment' }
        ]
      },
      {
        categoryId: 'hr-performance-management',
        workTypes: [
          { id: 'hr-pm-goal-setting', label: 'Goal Setting & OKRs' },
          { id: 'hr-pm-performance-reviews', label: 'Performance Review Process' },
          { id: 'hr-pm-360-feedback', label: '360-Degree Feedback Systems' },
          { id: 'hr-pm-pip-management', label: 'Performance Improvement Plans' },
          { id: 'hr-pm-calibration-process', label: 'Performance Calibration' },
          { id: 'hr-pm-talent-identification', label: 'High Performer Identification' },
          { id: 'hr-pm-coaching-development', label: 'Manager Coaching Development' },
          { id: 'hr-pm-recognition-programs', label: 'Employee Recognition Programs' }
        ]
      },

      // LEADERSHIP FOCUS AREA
      {
        categoryId: 'leadership-change-management',
        workTypes: [
          { id: 'leadership-change-strategy', label: 'Change Strategy Development' },
          { id: 'leadership-change-communication', label: 'Change Communication Planning' },
          { id: 'leadership-change-resistance', label: 'Change Resistance Management' },
          { id: 'leadership-change-training', label: 'Change Management Training' },
          { id: 'leadership-change-stakeholder', label: 'Stakeholder Engagement' },
          { id: 'leadership-change-implementation', label: 'Change Implementation Planning' },
          { id: 'leadership-change-measurement', label: 'Change Impact Measurement' },
          { id: 'leadership-change-sustainability', label: 'Change Sustainability Planning' }
        ]
      },
      {
        categoryId: 'leadership-crisis-management',
        workTypes: [
          { id: 'leadership-crisis-planning', label: 'Crisis Response Planning' },
          { id: 'leadership-crisis-communication', label: 'Crisis Communication Management' },
          { id: 'leadership-crisis-team-coordination', label: 'Crisis Team Coordination' },
          { id: 'leadership-crisis-decision-making', label: 'Crisis Decision Making' },
          { id: 'leadership-crisis-stakeholder', label: 'Crisis Stakeholder Management' },
          { id: 'leadership-crisis-recovery', label: 'Crisis Recovery Planning' },
          { id: 'leadership-crisis-simulation', label: 'Crisis Simulation & Training' },
          { id: 'leadership-crisis-post-analysis', label: 'Post-Crisis Analysis' }
        ]
      },
      {
        categoryId: 'leadership-cross-functional-leadership',
        workTypes: [
          { id: 'leadership-cross-team-coordination', label: 'Cross-Team Coordination' },
          { id: 'leadership-cross-stakeholder-alignment', label: 'Stakeholder Alignment' },
          { id: 'leadership-cross-project-leadership', label: 'Cross-Functional Project Leadership' },
          { id: 'leadership-cross-conflict-resolution', label: 'Inter-Team Conflict Resolution' },
          { id: 'leadership-cross-resource-coordination', label: 'Resource Coordination' },
          { id: 'leadership-cross-communication', label: 'Cross-Functional Communication' },
          { id: 'leadership-cross-goal-alignment', label: 'Cross-Team Goal Alignment' },
          { id: 'leadership-cross-process-optimization', label: 'Cross-Functional Process Optimization' }
        ]
      },
      {
        categoryId: 'leadership-executive-leadership',
        workTypes: [
          { id: 'leadership-exec-vision-setting', label: 'Vision & Strategy Setting' },
          { id: 'leadership-exec-board-relations', label: 'Board Relations Management' },
          { id: 'leadership-exec-investor-relations', label: 'Executive Investor Relations' },
          { id: 'leadership-exec-culture-development', label: 'Culture Development' },
          { id: 'leadership-exec-succession-planning', label: 'Executive Succession Planning' },
          { id: 'leadership-exec-talent-development', label: 'Executive Talent Development' },
          { id: 'leadership-exec-strategic-communication', label: 'Strategic Communication' },
          { id: 'leadership-exec-performance-management', label: 'Executive Performance Management' }
        ]
      },
      {
        categoryId: 'leadership-organizational-development',
        workTypes: [
          { id: 'leadership-od-structure-design', label: 'Organizational Structure Design' },
          { id: 'leadership-od-culture-transformation', label: 'Culture Transformation Leadership' },
          { id: 'leadership-od-capability-building', label: 'Organizational Capability Building' },
          { id: 'leadership-od-change-leadership', label: 'Organizational Change Leadership' },
          { id: 'leadership-od-talent-strategy', label: 'Organizational Talent Strategy' },
          { id: 'leadership-od-effectiveness-improvement', label: 'Organizational Effectiveness' },
          { id: 'leadership-od-scaling-leadership', label: 'Organizational Scaling Leadership' },
          { id: 'leadership-od-transformation-management', label: 'Digital Transformation Leadership' }
        ]
      },
      {
        categoryId: 'leadership-people-management',
        workTypes: [
          { id: 'leadership-people-hiring', label: 'Strategic Hiring & Recruitment' },
          { id: 'leadership-people-development', label: 'People Development Planning' },
          { id: 'leadership-people-performance', label: 'Performance Management Leadership' },
          { id: 'leadership-people-coaching', label: 'Leadership Coaching & Mentoring' },
          { id: 'leadership-people-retention', label: 'Talent Retention Strategies' },
          { id: 'leadership-people-engagement', label: 'Employee Engagement Leadership' },
          { id: 'leadership-people-feedback', label: 'Feedback Culture Development' },
          { id: 'leadership-people-career-planning', label: 'Career Development Leadership' }
        ]
      },
      {
        categoryId: 'leadership-strategic-leadership',
        workTypes: [
          { id: 'leadership-strategic-planning', label: 'Strategic Planning Leadership' },
          { id: 'leadership-strategic-execution', label: 'Strategy Execution Management' },
          { id: 'leadership-strategic-innovation', label: 'Innovation Strategy Leadership' },
          { id: 'leadership-strategic-competitive', label: 'Competitive Strategy Development' },
          { id: 'leadership-strategic-transformation', label: 'Business Transformation Leadership' },
          { id: 'leadership-strategic-portfolio', label: 'Portfolio Strategy Management' },
          { id: 'leadership-strategic-partnerships', label: 'Strategic Partnership Leadership' },
          { id: 'leadership-strategic-market', label: 'Market Strategy Leadership' }
        ]
      },
      {
        categoryId: 'leadership-team-management',
        workTypes: [
          { id: 'leadership-team-building', label: 'Team Building & Development' },
          { id: 'leadership-team-goal-setting', label: 'Team Goal Setting & Alignment' },
          { id: 'leadership-team-performance', label: 'Team Performance Optimization' },
          { id: 'leadership-team-communication', label: 'Team Communication Leadership' },
          { id: 'leadership-team-conflict', label: 'Team Conflict Resolution' },
          { id: 'leadership-team-delegation', label: 'Effective Delegation' },
          { id: 'leadership-team-motivation', label: 'Team Motivation & Engagement' },
          { id: 'leadership-team-remote', label: 'Remote Team Management' }
        ]
      },

      // LEGAL FOCUS AREA
      {
        categoryId: 'legal-compliance',
        workTypes: [
          { id: 'legal-compliance-program-development', label: 'Compliance Program Development' },
          { id: 'legal-compliance-risk-assessment', label: 'Compliance Risk Assessment' },
          { id: 'legal-compliance-training', label: 'Compliance Training Programs' },
          { id: 'legal-compliance-monitoring', label: 'Compliance Monitoring & Auditing' },
          { id: 'legal-compliance-reporting', label: 'Regulatory Reporting' },
          { id: 'legal-compliance-investigation', label: 'Compliance Investigation Management' },
          { id: 'legal-compliance-remediation', label: 'Compliance Remediation' },
          { id: 'legal-compliance-policy-development', label: 'Compliance Policy Development' }
        ]
      },
      {
        categoryId: 'legal-corporate-law',
        workTypes: [
          { id: 'legal-corporate-governance', label: 'Corporate Governance' },
          { id: 'legal-corporate-formation', label: 'Corporate Formation & Structure' },
          { id: 'legal-corporate-board-advisory', label: 'Board Advisory & Support' },
          { id: 'legal-corporate-securities', label: 'Securities Law Compliance' },
          { id: 'legal-corporate-ma-support', label: 'M&A Legal Support' },
          { id: 'legal-corporate-financing', label: 'Corporate Financing Legal Support' },
          { id: 'legal-corporate-restructuring', label: 'Corporate Restructuring' },
          { id: 'legal-corporate-filings', label: 'Corporate Filing Management' }
        ]
      },
      {
        categoryId: 'legal-employment-law',
        workTypes: [
          { id: 'legal-employment-policy-development', label: 'Employment Policy Development' },
          { id: 'legal-employment-dispute-resolution', label: 'Employment Dispute Resolution' },
          { id: 'legal-employment-wage-hour', label: 'Wage & Hour Compliance' },
          { id: 'legal-employment-discrimination', label: 'Discrimination Law Compliance' },
          { id: 'legal-employment-harassment', label: 'Harassment Prevention & Response' },
          { id: 'legal-employment-termination', label: 'Employment Termination Management' },
          { id: 'legal-employment-benefits', label: 'Employee Benefits Legal Support' },
          { id: 'legal-employment-classification', label: 'Worker Classification Analysis' }
        ]
      },
      {
        categoryId: 'legal-intellectual-property',
        workTypes: [
          { id: 'legal-ip-patent-management', label: 'Patent Portfolio Management' },
          { id: 'legal-ip-trademark-protection', label: 'Trademark Protection & Enforcement' },
          { id: 'legal-ip-copyright-management', label: 'Copyright Management' },
          { id: 'legal-ip-trade-secrets', label: 'Trade Secret Protection' },
          { id: 'legal-ip-licensing', label: 'IP Licensing & Agreements' },
          { id: 'legal-ip-infringement', label: 'IP Infringement Analysis' },
          { id: 'legal-ip-due-diligence', label: 'IP Due Diligence' },
          { id: 'legal-ip-strategy', label: 'IP Strategy Development' }
        ]
      },
      {
        categoryId: 'legal-privacy-data-protection',
        workTypes: [
          { id: 'legal-privacy-gdpr-compliance', label: 'GDPR Compliance Management' },
          { id: 'legal-privacy-ccpa-compliance', label: 'CCPA Compliance Management' },
          { id: 'legal-privacy-policy-development', label: 'Privacy Policy Development' },
          { id: 'legal-privacy-data-mapping', label: 'Data Mapping & Classification' },
          { id: 'legal-privacy-impact-assessment', label: 'Privacy Impact Assessments' },
          { id: 'legal-privacy-breach-response', label: 'Data Breach Response' },
          { id: 'legal-privacy-vendor-management', label: 'Privacy Vendor Management' },
          { id: 'legal-privacy-training', label: 'Privacy Training & Awareness' }
        ]
      },
      {
        categoryId: 'legal-regulatory-affairs',
        workTypes: [
          { id: 'legal-regulatory-analysis', label: 'Regulatory Analysis & Interpretation' },
          { id: 'legal-regulatory-submission', label: 'Regulatory Submission Management' },
          { id: 'legal-regulatory-agency-relations', label: 'Regulatory Agency Relations' },
          { id: 'legal-regulatory-compliance-monitoring', label: 'Regulatory Compliance Monitoring' },
          { id: 'legal-regulatory-impact-assessment', label: 'Regulatory Impact Assessment' },
          { id: 'legal-regulatory-strategy', label: 'Regulatory Strategy Development' },
          { id: 'legal-regulatory-advocacy', label: 'Regulatory Advocacy' },
          { id: 'legal-regulatory-change-management', label: 'Regulatory Change Management' }
        ]
      },
      {
        categoryId: 'legal-securities-law',
        workTypes: [
          { id: 'legal-securities-public-offerings', label: 'Public Offering Management' },
          { id: 'legal-securities-private-placement', label: 'Private Placement Transactions' },
          { id: 'legal-securities-disclosure', label: 'Securities Disclosure Management' },
          { id: 'legal-securities-insider-trading', label: 'Insider Trading Compliance' },
          { id: 'legal-securities-proxy-statements', label: 'Proxy Statement Preparation' },
          { id: 'legal-securities-reporting', label: 'Securities Reporting Compliance' },
          { id: 'legal-securities-shareholder-relations', label: 'Shareholder Relations Legal Support' },
          { id: 'legal-securities-market-regulation', label: 'Market Regulation Compliance' }
        ]
      }
    ];

    // Part 1: Finance, HR, Leadership, Legal (first batch)
    let totalAdded = 0;
    let totalSkipped = 0;
    let currentBatch = 1;
    const totalBatches = Math.ceil(workTypesToAdd.length / 10); // Process in batches of 10

    console.log(`📦 Processing Batch ${currentBatch}/${totalBatches} (Finance, HR, Leadership, Legal)`);
    console.log(`Categories in this batch: ${workTypesToAdd.length}`);
    console.log('');

    for (const categoryData of workTypesToAdd) {
      console.log(`📌 Processing category: ${categoryData.categoryId}...`);
      
      // Verify category exists
      const category = await prisma.workCategory.findUnique({
        where: { id: categoryData.categoryId }
      });

      if (!category) {
        console.log(`   ❌ Category ${categoryData.categoryId} not found, skipping...`);
        continue;
      }

      for (const workType of categoryData.workTypes) {
        // Check if work type already exists
        const existingWorkType = await prisma.workType.findUnique({
          where: { id: workType.id }
        });

        if (existingWorkType) {
          console.log(`   ⚠️  Work type "${workType.label}" already exists, skipping...`);
          totalSkipped++;
          continue;
        }

        // Add the work type
        try {
          await prisma.workType.create({
            data: {
              id: workType.id,
              label: workType.label,
              workCategoryId: categoryData.categoryId
            }
          });

          console.log(`   ✅ Added work type: "${workType.label}"`);
          totalAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add "${workType.label}": ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 BATCH 1 SUMMARY:');
    console.log(`✅ Work types added: ${totalAdded}`);
    console.log(`⚠️  Work types skipped (already exist): ${totalSkipped}`);
    console.log('');

    console.log('ℹ️  This is Part 1 of the work type addition process.');
    console.log('   Next, run the script for Marketing, Operations, Product Management, Sales, and Strategy.');
    console.log('');

    console.log('✅ Batch 1 completed successfully!');

  } catch (error) {
    console.error('❌ Error adding work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });