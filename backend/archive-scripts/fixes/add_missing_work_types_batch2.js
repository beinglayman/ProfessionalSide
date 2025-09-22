const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMissingWorkTypesBatch2() {
  try {
    console.log('🔄 Adding missing work types - Batch 2...\n');

    // Define work types for Marketing, Operations, Product Management, Sales, and Strategy
    const workTypesToAdd = [
      // MARKETING FOCUS AREA
      {
        categoryId: 'marketing-brand-marketing',
        workTypes: [
          { id: 'marketing-brand-marketing-positioning', label: 'Brand Positioning Strategy' },
          { id: 'marketing-brand-marketing-messaging', label: 'Brand Messaging Development' },
          { id: 'marketing-brand-marketing-voice', label: 'Brand Voice & Tone Development' },
          { id: 'marketing-brand-marketing-guidelines', label: 'Brand Guidelines Creation' },
          { id: 'marketing-brand-marketing-campaigns', label: 'Brand Awareness Campaigns' },
          { id: 'marketing-brand-marketing-partnerships', label: 'Brand Partnership Development' },
          { id: 'marketing-brand-marketing-crisis', label: 'Brand Crisis Management' },
          { id: 'marketing-brand-marketing-research', label: 'Brand Research & Analysis' }
        ]
      },
      {
        categoryId: 'marketing-content-marketing',
        workTypes: [
          { id: 'marketing-content-marketing-strategy', label: 'Content Marketing Strategy' },
          { id: 'marketing-content-marketing-calendar', label: 'Editorial Calendar Planning' },
          { id: 'marketing-content-marketing-creation', label: 'Content Creation & Production' },
          { id: 'marketing-content-marketing-distribution', label: 'Content Distribution Strategy' },
          { id: 'marketing-content-marketing-seo', label: 'SEO Content Optimization' },
          { id: 'marketing-content-marketing-video', label: 'Video Content Production' },
          { id: 'marketing-content-marketing-webinars', label: 'Webinar Content Development' },
          { id: 'marketing-content-marketing-analytics', label: 'Content Performance Analytics' }
        ]
      },
      {
        categoryId: 'marketing-digital-marketing',
        workTypes: [
          { id: 'marketing-digital-paid-advertising', label: 'Paid Digital Advertising' },
          { id: 'marketing-digital-social-media', label: 'Social Media Marketing' },
          { id: 'marketing-digital-search-marketing', label: 'Search Engine Marketing' },
          { id: 'marketing-digital-display-advertising', label: 'Display Advertising Campaigns' },
          { id: 'marketing-digital-retargeting', label: 'Retargeting Campaigns' },
          { id: 'marketing-digital-influencer', label: 'Influencer Marketing' },
          { id: 'marketing-digital-affiliate', label: 'Affiliate Marketing Programs' },
          { id: 'marketing-digital-automation', label: 'Marketing Automation' }
        ]
      },
      {
        categoryId: 'marketing-email-marketing',
        workTypes: [
          { id: 'marketing-email-campaign-strategy', label: 'Email Campaign Strategy' },
          { id: 'marketing-email-automation', label: 'Email Automation Workflows' },
          { id: 'marketing-email-segmentation', label: 'Email List Segmentation' },
          { id: 'marketing-email-personalization', label: 'Email Personalization' },
          { id: 'marketing-email-ab-testing', label: 'Email A/B Testing' },
          { id: 'marketing-email-deliverability', label: 'Email Deliverability Optimization' },
          { id: 'marketing-email-analytics', label: 'Email Performance Analytics' },
          { id: 'marketing-email-drip-campaigns', label: 'Drip Campaign Development' }
        ]
      },
      {
        categoryId: 'marketing-growth-marketing',
        workTypes: [
          { id: 'marketing-growth-experimentation', label: 'Growth Experimentation' },
          { id: 'marketing-growth-funnel-optimization', label: 'Conversion Funnel Optimization' },
          { id: 'marketing-growth-user-acquisition', label: 'User Acquisition Strategy' },
          { id: 'marketing-growth-retention', label: 'User Retention Programs' },
          { id: 'marketing-growth-viral-marketing', label: 'Viral Marketing Campaigns' },
          { id: 'marketing-growth-referral-programs', label: 'Referral Program Development' },
          { id: 'marketing-growth-cohort-analysis', label: 'Cohort Analysis & Insights' },
          { id: 'marketing-growth-product-led-growth', label: 'Product-Led Growth Strategy' }
        ]
      },
      {
        categoryId: 'marketing-marketing-analytics',
        workTypes: [
          { id: 'marketing-analytics-data-analysis', label: 'Marketing Data Analysis' },
          { id: 'marketing-analytics-attribution', label: 'Marketing Attribution Modeling' },
          { id: 'marketing-analytics-roi-measurement', label: 'Marketing ROI Measurement' },
          { id: 'marketing-analytics-customer-lifetime-value', label: 'Customer Lifetime Value Analysis' },
          { id: 'marketing-analytics-reporting', label: 'Marketing Performance Reporting' },
          { id: 'marketing-analytics-dashboard', label: 'Marketing Dashboard Development' },
          { id: 'marketing-analytics-predictive', label: 'Predictive Marketing Analytics' },
          { id: 'marketing-analytics-campaign-analysis', label: 'Campaign Performance Analysis' }
        ]
      },
      {
        categoryId: 'marketing-performance-marketing',
        workTypes: [
          { id: 'marketing-performance-paid-search', label: 'Paid Search Optimization' },
          { id: 'marketing-performance-paid-social', label: 'Paid Social Media Campaigns' },
          { id: 'marketing-performance-conversion-optimization', label: 'Conversion Rate Optimization' },
          { id: 'marketing-performance-budget-optimization', label: 'Marketing Budget Optimization' },
          { id: 'marketing-performance-bid-management', label: 'Bid Management & Optimization' },
          { id: 'marketing-performance-landing-page', label: 'Landing Page Optimization' },
          { id: 'marketing-performance-tracking', label: 'Performance Tracking & Analytics' },
          { id: 'marketing-performance-testing', label: 'Performance Marketing Testing' }
        ]
      },
      {
        categoryId: 'marketing-seo-sem',
        workTypes: [
          { id: 'marketing-seo-keyword-research', label: 'Keyword Research & Strategy' },
          { id: 'marketing-seo-on-page-optimization', label: 'On-Page SEO Optimization' },
          { id: 'marketing-seo-technical-seo', label: 'Technical SEO Implementation' },
          { id: 'marketing-seo-link-building', label: 'Link Building Strategy' },
          { id: 'marketing-seo-content-optimization', label: 'SEO Content Optimization' },
          { id: 'marketing-seo-local-seo', label: 'Local SEO Management' },
          { id: 'marketing-seo-search-ads', label: 'Search Engine Advertising' },
          { id: 'marketing-seo-performance-tracking', label: 'SEO Performance Tracking' }
        ]
      },
      {
        categoryId: 'marketing-social-media-marketing',
        workTypes: [
          { id: 'marketing-social-strategy', label: 'Social Media Strategy Development' },
          { id: 'marketing-social-content-creation', label: 'Social Media Content Creation' },
          { id: 'marketing-social-community-management', label: 'Social Media Community Management' },
          { id: 'marketing-social-advertising', label: 'Social Media Advertising' },
          { id: 'marketing-social-influencer-partnerships', label: 'Social Media Influencer Partnerships' },
          { id: 'marketing-social-analytics', label: 'Social Media Analytics' },
          { id: 'marketing-social-crisis-management', label: 'Social Media Crisis Management' },
          { id: 'marketing-social-platform-optimization', label: 'Platform-Specific Optimization' }
        ]
      },

      // OPERATIONS FOCUS AREA
      {
        categoryId: 'operations-business-operations',
        workTypes: [
          { id: 'operations-business-process-design', label: 'Business Process Design' },
          { id: 'operations-business-workflow-optimization', label: 'Workflow Optimization' },
          { id: 'operations-business-efficiency-analysis', label: 'Operational Efficiency Analysis' },
          { id: 'operations-business-automation', label: 'Business Process Automation' },
          { id: 'operations-business-kpi-management', label: 'KPI Management & Tracking' },
          { id: 'operations-business-capacity-planning', label: 'Capacity Planning' },
          { id: 'operations-business-cost-optimization', label: 'Cost Optimization' },
          { id: 'operations-business-performance-improvement', label: 'Performance Improvement' }
        ]
      },
      {
        categoryId: 'operations-compliance',
        workTypes: [
          { id: 'operations-compliance-policy-development', label: 'Operational Compliance Policy Development' },
          { id: 'operations-compliance-audit-management', label: 'Compliance Audit Management' },
          { id: 'operations-compliance-risk-assessment', label: 'Operational Risk Assessment' },
          { id: 'operations-compliance-training', label: 'Compliance Training Programs' },
          { id: 'operations-compliance-monitoring', label: 'Compliance Monitoring Systems' },
          { id: 'operations-compliance-reporting', label: 'Compliance Reporting' },
          { id: 'operations-compliance-remediation', label: 'Compliance Remediation' },
          { id: 'operations-compliance-certification', label: 'Certification Management' }
        ]
      },
      {
        categoryId: 'operations-process-improvement',
        workTypes: [
          { id: 'operations-process-lean-six-sigma', label: 'Lean Six Sigma Implementation' },
          { id: 'operations-process-value-stream-mapping', label: 'Value Stream Mapping' },
          { id: 'operations-process-kaizen', label: 'Kaizen Events & Continuous Improvement' },
          { id: 'operations-process-root-cause-analysis', label: 'Root Cause Analysis' },
          { id: 'operations-process-standardization', label: 'Process Standardization' },
          { id: 'operations-process-measurement', label: 'Process Performance Measurement' },
          { id: 'operations-process-reengineering', label: 'Business Process Reengineering' },
          { id: 'operations-process-change-management', label: 'Process Change Management' }
        ]
      },
      {
        categoryId: 'operations-project-management',
        workTypes: [
          { id: 'operations-pm-project-planning', label: 'Project Planning & Scheduling' },
          { id: 'operations-pm-resource-management', label: 'Project Resource Management' },
          { id: 'operations-pm-risk-management', label: 'Project Risk Management' },
          { id: 'operations-pm-stakeholder-management', label: 'Project Stakeholder Management' },
          { id: 'operations-pm-budget-management', label: 'Project Budget Management' },
          { id: 'operations-pm-agile-scrum', label: 'Agile/Scrum Project Management' },
          { id: 'operations-pm-portfolio-management', label: 'Project Portfolio Management' },
          { id: 'operations-pm-delivery-management', label: 'Project Delivery Management' }
        ]
      },
      {
        categoryId: 'operations-quality-management',
        workTypes: [
          { id: 'operations-quality-system-design', label: 'Quality Management System Design' },
          { id: 'operations-quality-assurance', label: 'Quality Assurance Programs' },
          { id: 'operations-quality-control', label: 'Quality Control Processes' },
          { id: 'operations-quality-improvement', label: 'Quality Improvement Initiatives' },
          { id: 'operations-quality-audits', label: 'Quality Audits & Assessments' },
          { id: 'operations-quality-standards', label: 'Quality Standards Implementation' },
          { id: 'operations-quality-training', label: 'Quality Training Programs' },
          { id: 'operations-quality-metrics', label: 'Quality Metrics & Reporting' }
        ]
      },
      {
        categoryId: 'operations-risk-management',
        workTypes: [
          { id: 'operations-risk-assessment', label: 'Operational Risk Assessment' },
          { id: 'operations-risk-mitigation', label: 'Risk Mitigation Strategy' },
          { id: 'operations-risk-monitoring', label: 'Risk Monitoring & Reporting' },
          { id: 'operations-risk-business-continuity', label: 'Business Continuity Planning' },
          { id: 'operations-risk-disaster-recovery', label: 'Disaster Recovery Planning' },
          { id: 'operations-risk-insurance', label: 'Insurance & Risk Transfer' },
          { id: 'operations-risk-crisis-management', label: 'Operational Crisis Management' },
          { id: 'operations-risk-compliance', label: 'Risk Compliance Management' }
        ]
      },
      {
        categoryId: 'operations-supply-chain-management',
        workTypes: [
          { id: 'operations-scm-procurement', label: 'Procurement Management' },
          { id: 'operations-scm-supplier-management', label: 'Supplier Relationship Management' },
          { id: 'operations-scm-inventory-management', label: 'Inventory Management' },
          { id: 'operations-scm-logistics', label: 'Logistics & Distribution' },
          { id: 'operations-scm-demand-planning', label: 'Demand Planning & Forecasting' },
          { id: 'operations-scm-sourcing', label: 'Strategic Sourcing' },
          { id: 'operations-scm-optimization', label: 'Supply Chain Optimization' },
          { id: 'operations-scm-risk-management', label: 'Supply Chain Risk Management' }
        ]
      },
      {
        categoryId: 'operations-vendor-management',
        workTypes: [
          { id: 'operations-vendor-selection', label: 'Vendor Selection & Evaluation' },
          { id: 'operations-vendor-contract-management', label: 'Vendor Contract Management' },
          { id: 'operations-vendor-performance', label: 'Vendor Performance Management' },
          { id: 'operations-vendor-relationship', label: 'Vendor Relationship Management' },
          { id: 'operations-vendor-onboarding', label: 'Vendor Onboarding Process' },
          { id: 'operations-vendor-risk-assessment', label: 'Vendor Risk Assessment' },
          { id: 'operations-vendor-compliance', label: 'Vendor Compliance Management' },
          { id: 'operations-vendor-cost-optimization', label: 'Vendor Cost Optimization' }
        ]
      },

      // PRODUCT MANAGEMENT FOCUS AREA
      {
        categoryId: 'product-management-product-analytics',
        workTypes: [
          { id: 'pm-analytics-user-behavior', label: 'User Behavior Analysis' },
          { id: 'pm-analytics-product-metrics', label: 'Product Metrics & KPIs' },
          { id: 'pm-analytics-cohort-analysis', label: 'Product Cohort Analysis' },
          { id: 'pm-analytics-funnel-analysis', label: 'Product Funnel Analysis' },
          { id: 'pm-analytics-ab-testing', label: 'Product A/B Testing' },
          { id: 'pm-analytics-dashboard', label: 'Product Analytics Dashboard' },
          { id: 'pm-analytics-predictive', label: 'Predictive Product Analytics' },
          { id: 'pm-analytics-retention', label: 'Product Retention Analysis' }
        ]
      },
      {
        categoryId: 'product-management-product-development',
        workTypes: [
          { id: 'pm-development-feature-development', label: 'Feature Development Planning' },
          { id: 'pm-development-product-design', label: 'Product Design Collaboration' },
          { id: 'pm-development-technical-specification', label: 'Technical Specification Writing' },
          { id: 'pm-development-sprint-planning', label: 'Sprint Planning & Management' },
          { id: 'pm-development-release-planning', label: 'Release Planning & Management' },
          { id: 'pm-development-agile-management', label: 'Agile Development Management' },
          { id: 'pm-development-cross-functional', label: 'Cross-Functional Team Leadership' },
          { id: 'pm-development-quality-assurance', label: 'Product Quality Assurance' }
        ]
      },
      {
        categoryId: 'product-management-product-marketing',
        workTypes: [
          { id: 'pm-marketing-go-to-market', label: 'Go-to-Market Strategy' },
          { id: 'pm-marketing-positioning', label: 'Product Positioning' },
          { id: 'pm-marketing-messaging', label: 'Product Messaging Development' },
          { id: 'pm-marketing-competitive-analysis', label: 'Competitive Product Analysis' },
          { id: 'pm-marketing-launch-planning', label: 'Product Launch Planning' },
          { id: 'pm-marketing-sales-enablement', label: 'Sales Enablement & Training' },
          { id: 'pm-marketing-customer-education', label: 'Customer Education Programs' },
          { id: 'pm-marketing-pricing-strategy', label: 'Product Pricing Strategy' }
        ]
      },
      {
        categoryId: 'product-management-product-operations',
        workTypes: [
          { id: 'pm-ops-process-optimization', label: 'Product Process Optimization' },
          { id: 'pm-ops-tool-management', label: 'Product Tool Management' },
          { id: 'pm-ops-data-management', label: 'Product Data Management' },
          { id: 'pm-ops-workflow-automation', label: 'Product Workflow Automation' },
          { id: 'pm-ops-team-enablement', label: 'Product Team Enablement' },
          { id: 'pm-ops-metrics-reporting', label: 'Product Metrics Reporting' },
          { id: 'pm-ops-vendor-management', label: 'Product Vendor Management' },
          { id: 'pm-ops-scalability-planning', label: 'Product Scalability Planning' }
        ]
      },
      {
        categoryId: 'product-management-product-strategy',
        workTypes: [
          { id: 'pm-strategy-vision-development', label: 'Product Vision Development' },
          { id: 'pm-strategy-market-analysis', label: 'Product Market Analysis' },
          { id: 'pm-strategy-competitive-strategy', label: 'Product Competitive Strategy' },
          { id: 'pm-strategy-platform-strategy', label: 'Product Platform Strategy' },
          { id: 'pm-strategy-monetization', label: 'Product Monetization Strategy' },
          { id: 'pm-strategy-portfolio-management', label: 'Product Portfolio Management' },
          { id: 'pm-strategy-innovation', label: 'Product Innovation Strategy' },
          { id: 'pm-strategy-expansion', label: 'Product Expansion Strategy' }
        ]
      },
      {
        categoryId: 'product-management-roadmap-planning',
        workTypes: [
          { id: 'pm-roadmap-strategic-planning', label: 'Strategic Roadmap Planning' },
          { id: 'pm-roadmap-prioritization', label: 'Feature Prioritization' },
          { id: 'pm-roadmap-timeline-management', label: 'Roadmap Timeline Management' },
          { id: 'pm-roadmap-stakeholder-communication', label: 'Roadmap Stakeholder Communication' },
          { id: 'pm-roadmap-resource-planning', label: 'Roadmap Resource Planning' },
          { id: 'pm-roadmap-milestone-tracking', label: 'Roadmap Milestone Tracking' },
          { id: 'pm-roadmap-scenario-planning', label: 'Roadmap Scenario Planning' },
          { id: 'pm-roadmap-dependency-management', label: 'Roadmap Dependency Management' }
        ]
      },
      {
        categoryId: 'product-management-stakeholder-management',
        workTypes: [
          { id: 'pm-stakeholder-executive-communication', label: 'Executive Stakeholder Communication' },
          { id: 'pm-stakeholder-customer-advocacy', label: 'Customer Stakeholder Advocacy' },
          { id: 'pm-stakeholder-engineering-collaboration', label: 'Engineering Stakeholder Collaboration' },
          { id: 'pm-stakeholder-sales-support', label: 'Sales Stakeholder Support' },
          { id: 'pm-stakeholder-marketing-alignment', label: 'Marketing Stakeholder Alignment' },
          { id: 'pm-stakeholder-feedback-management', label: 'Stakeholder Feedback Management' },
          { id: 'pm-stakeholder-expectation-management', label: 'Stakeholder Expectation Management' },
          { id: 'pm-stakeholder-influence-management', label: 'Stakeholder Influence Management' }
        ]
      },
      {
        categoryId: 'product-management-user-research',
        workTypes: [
          { id: 'pm-research-user-interviews', label: 'User Interview Coordination' },
          { id: 'pm-research-survey-design', label: 'User Survey Design & Analysis' },
          { id: 'pm-research-usability-testing', label: 'Usability Testing Coordination' },
          { id: 'pm-research-market-research', label: 'Product Market Research' },
          { id: 'pm-research-competitive-research', label: 'Competitive Research' },
          { id: 'pm-research-user-persona', label: 'User Persona Development' },
          { id: 'pm-research-journey-mapping', label: 'User Journey Mapping' },
          { id: 'pm-research-insights-synthesis', label: 'Research Insights Synthesis' }
        ]
      }
    ];

    // Process the work types
    let totalAdded = 0;
    let totalSkipped = 0;

    console.log(`📦 Processing Batch 2 (Marketing, Operations, Product Management)`);
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

    console.log('📊 BATCH 2 SUMMARY:');
    console.log(`✅ Work types added: ${totalAdded}`);
    console.log(`⚠️  Work types skipped (already exist): ${totalSkipped}`);
    console.log('');

    console.log('ℹ️  This is Part 2 of the work type addition process.');
    console.log('   Next, run Batch 3 for Sales and Strategy.');
    console.log('');

    console.log('✅ Batch 2 completed successfully!');

  } catch (error) {
    console.error('❌ Error adding work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingWorkTypesBatch2()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });