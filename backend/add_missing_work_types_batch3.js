const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMissingWorkTypesBatch3() {
  try {
    console.log('🔄 Adding missing work types - Final Batch 3...\n');

    // Define work types for Sales and Strategy focus areas
    const workTypesToAdd = [
      // SALES FOCUS AREA
      {
        categoryId: 'sales-business-development',
        workTypes: [
          { id: 'sales-bd-partnership-development', label: 'Partnership Development' },
          { id: 'sales-bd-strategic-alliances', label: 'Strategic Alliance Management' },
          { id: 'sales-bd-market-expansion', label: 'Market Expansion Strategy' },
          { id: 'sales-bd-new-business-identification', label: 'New Business Identification' },
          { id: 'sales-bd-relationship-building', label: 'Relationship Building & Networking' },
          { id: 'sales-bd-deal-structuring', label: 'Business Deal Structuring' },
          { id: 'sales-bd-revenue-growth', label: 'Revenue Growth Strategy' },
          { id: 'sales-bd-market-research', label: 'Business Development Market Research' }
        ]
      },
      {
        categoryId: 'sales-channel-partnerships',
        workTypes: [
          { id: 'sales-channel-partner-recruitment', label: 'Channel Partner Recruitment' },
          { id: 'sales-channel-partner-enablement', label: 'Channel Partner Enablement' },
          { id: 'sales-channel-program-development', label: 'Channel Program Development' },
          { id: 'sales-channel-performance-management', label: 'Channel Performance Management' },
          { id: 'sales-channel-training-programs', label: 'Channel Training Programs' },
          { id: 'sales-channel-incentive-programs', label: 'Channel Incentive Programs' },
          { id: 'sales-channel-conflict-resolution', label: 'Channel Conflict Resolution' },
          { id: 'sales-channel-expansion-strategy', label: 'Channel Expansion Strategy' }
        ]
      },
      {
        categoryId: 'sales-customer-success',
        workTypes: [
          { id: 'sales-cs-onboarding-management', label: 'Customer Onboarding Management' },
          { id: 'sales-cs-relationship-management', label: 'Customer Relationship Management' },
          { id: 'sales-cs-retention-strategy', label: 'Customer Retention Strategy' },
          { id: 'sales-cs-expansion-revenue', label: 'Customer Expansion Revenue' },
          { id: 'sales-cs-health-monitoring', label: 'Customer Health Monitoring' },
          { id: 'sales-cs-advocacy-programs', label: 'Customer Advocacy Programs' },
          { id: 'sales-cs-renewal-management', label: 'Customer Renewal Management' },
          { id: 'sales-cs-satisfaction-improvement', label: 'Customer Satisfaction Improvement' }
        ]
      },
      {
        categoryId: 'sales-enterprise-sales',
        workTypes: [
          { id: 'sales-enterprise-strategic-selling', label: 'Strategic Enterprise Selling' },
          { id: 'sales-enterprise-complex-deal-management', label: 'Complex Deal Management' },
          { id: 'sales-enterprise-stakeholder-mapping', label: 'Enterprise Stakeholder Mapping' },
          { id: 'sales-enterprise-solution-selling', label: 'Enterprise Solution Selling' },
          { id: 'sales-enterprise-procurement-navigation', label: 'Enterprise Procurement Navigation' },
          { id: 'sales-enterprise-contract-negotiation', label: 'Enterprise Contract Negotiation' },
          { id: 'sales-enterprise-relationship-management', label: 'Enterprise Relationship Management' },
          { id: 'sales-enterprise-territory-management', label: 'Enterprise Territory Management' }
        ]
      },
      {
        categoryId: 'sales-inside-sales',
        workTypes: [
          { id: 'sales-inside-lead-qualification', label: 'Inside Sales Lead Qualification' },
          { id: 'sales-inside-phone-sales', label: 'Phone Sales & Cold Calling' },
          { id: 'sales-inside-virtual-demos', label: 'Virtual Product Demonstrations' },
          { id: 'sales-inside-pipeline-management', label: 'Inside Sales Pipeline Management' },
          { id: 'sales-inside-crm-management', label: 'CRM Management & Data Entry' },
          { id: 'sales-inside-follow-up-automation', label: 'Follow-up Automation & Sequencing' },
          { id: 'sales-inside-conversion-optimization', label: 'Inside Sales Conversion Optimization' },
          { id: 'sales-inside-team-coordination', label: 'Inside Sales Team Coordination' }
        ]
      },
      {
        categoryId: 'sales-sales-development',
        workTypes: [
          { id: 'sales-sdr-lead-generation', label: 'SDR Lead Generation' },
          { id: 'sales-sdr-prospecting-strategy', label: 'Sales Prospecting Strategy' },
          { id: 'sales-sdr-outbound-campaigns', label: 'Outbound Sales Campaigns' },
          { id: 'sales-sdr-appointment-setting', label: 'Appointment Setting & Scheduling' },
          { id: 'sales-sdr-qualification-process', label: 'Lead Qualification Process' },
          { id: 'sales-sdr-handoff-management', label: 'Lead Handoff Management' },
          { id: 'sales-sdr-performance-optimization', label: 'SDR Performance Optimization' },
          { id: 'sales-sdr-training-development', label: 'SDR Training & Development' }
        ]
      },

      // STRATEGY FOCUS AREA
      {
        categoryId: 'strategy-business-development',
        workTypes: [
          { id: 'strategy-bd-growth-strategy', label: 'Business Growth Strategy' },
          { id: 'strategy-bd-market-entry', label: 'Market Entry Strategy' },
          { id: 'strategy-bd-expansion-planning', label: 'Business Expansion Planning' },
          { id: 'strategy-bd-diversification', label: 'Business Diversification Strategy' },
          { id: 'strategy-bd-strategic-initiatives', label: 'Strategic Initiative Development' },
          { id: 'strategy-bd-investment-strategy', label: 'Business Investment Strategy' },
          { id: 'strategy-bd-value-creation', label: 'Value Creation Strategy' },
          { id: 'strategy-bd-transformation-strategy', label: 'Business Transformation Strategy' }
        ]
      },
      {
        categoryId: 'strategy-business-strategy',
        workTypes: [
          { id: 'strategy-business-strategic-planning', label: 'Strategic Business Planning' },
          { id: 'strategy-business-vision-mission', label: 'Vision & Mission Development' },
          { id: 'strategy-business-swot-analysis', label: 'SWOT Analysis & Strategic Assessment' },
          { id: 'strategy-business-competitive-positioning', label: 'Competitive Positioning Strategy' },
          { id: 'strategy-business-portfolio-strategy', label: 'Business Portfolio Strategy' },
          { id: 'strategy-business-operational-strategy', label: 'Operational Strategy Development' },
          { id: 'strategy-business-performance-strategy', label: 'Performance Strategy & KPIs' },
          { id: 'strategy-business-sustainability', label: 'Business Sustainability Strategy' }
        ]
      },
      {
        categoryId: 'strategy-competitive-intelligence',
        workTypes: [
          { id: 'strategy-ci-competitor-analysis', label: 'Competitor Analysis & Profiling' },
          { id: 'strategy-ci-market-intelligence', label: 'Market Intelligence Gathering' },
          { id: 'strategy-ci-benchmarking', label: 'Competitive Benchmarking' },
          { id: 'strategy-ci-threat-assessment', label: 'Competitive Threat Assessment' },
          { id: 'strategy-ci-opportunity-identification', label: 'Competitive Opportunity Identification' },
          { id: 'strategy-ci-intelligence-reporting', label: 'Intelligence Reporting & Analysis' },
          { id: 'strategy-ci-war-gaming', label: 'Competitive War Gaming' },
          { id: 'strategy-ci-monitoring-systems', label: 'Competitive Monitoring Systems' }
        ]
      },
      {
        categoryId: 'strategy-corporate-development',
        workTypes: [
          { id: 'strategy-cd-ma-strategy', label: 'M&A Strategy Development' },
          { id: 'strategy-cd-acquisition-planning', label: 'Acquisition Planning & Execution' },
          { id: 'strategy-cd-divestiture-strategy', label: 'Divestiture Strategy' },
          { id: 'strategy-cd-joint-ventures', label: 'Joint Venture Development' },
          { id: 'strategy-cd-strategic-partnerships', label: 'Strategic Partnership Development' },
          { id: 'strategy-cd-integration-planning', label: 'Post-Acquisition Integration Planning' },
          { id: 'strategy-cd-portfolio-optimization', label: 'Corporate Portfolio Optimization' },
          { id: 'strategy-cd-value-creation', label: 'Corporate Value Creation' }
        ]
      },
      {
        categoryId: 'strategy-digital-transformation',
        workTypes: [
          { id: 'strategy-digital-strategy-development', label: 'Digital Strategy Development' },
          { id: 'strategy-digital-technology-roadmap', label: 'Digital Technology Roadmap' },
          { id: 'strategy-digital-process-digitization', label: 'Business Process Digitization' },
          { id: 'strategy-digital-customer-experience', label: 'Digital Customer Experience Strategy' },
          { id: 'strategy-digital-data-strategy', label: 'Digital Data Strategy' },
          { id: 'strategy-digital-innovation-strategy', label: 'Digital Innovation Strategy' },
          { id: 'strategy-digital-culture-change', label: 'Digital Culture Change Management' },
          { id: 'strategy-digital-capability-building', label: 'Digital Capability Building' }
        ]
      },
      {
        categoryId: 'strategy-market-analysis',
        workTypes: [
          { id: 'strategy-market-research', label: 'Market Research & Analysis' },
          { id: 'strategy-market-sizing', label: 'Market Sizing & Opportunity Assessment' },
          { id: 'strategy-market-segmentation', label: 'Market Segmentation Analysis' },
          { id: 'strategy-market-trends', label: 'Market Trend Analysis' },
          { id: 'strategy-market-customer-analysis', label: 'Customer Market Analysis' },
          { id: 'strategy-market-competitive-landscape', label: 'Competitive Landscape Analysis' },
          { id: 'strategy-market-entry-barriers', label: 'Market Entry Barrier Analysis' },
          { id: 'strategy-market-forecasting', label: 'Market Forecasting & Predictions' }
        ]
      },
      {
        categoryId: 'strategy-partnership-strategy',
        workTypes: [
          { id: 'strategy-partnership-identification', label: 'Strategic Partner Identification' },
          { id: 'strategy-partnership-evaluation', label: 'Partnership Opportunity Evaluation' },
          { id: 'strategy-partnership-negotiation', label: 'Partnership Negotiation Strategy' },
          { id: 'strategy-partnership-structure', label: 'Partnership Structure Design' },
          { id: 'strategy-partnership-governance', label: 'Partnership Governance Framework' },
          { id: 'strategy-partnership-performance', label: 'Partnership Performance Management' },
          { id: 'strategy-partnership-ecosystem', label: 'Partnership Ecosystem Development' },
          { id: 'strategy-partnership-exit-strategy', label: 'Partnership Exit Strategy' }
        ]
      },
      {
        categoryId: 'strategy-strategic-planning',
        workTypes: [
          { id: 'strategy-planning-long-term-planning', label: 'Long-term Strategic Planning' },
          { id: 'strategy-planning-scenario-planning', label: 'Strategic Scenario Planning' },
          { id: 'strategy-planning-goal-setting', label: 'Strategic Goal Setting & OKRs' },
          { id: 'strategy-planning-resource-allocation', label: 'Strategic Resource Allocation' },
          { id: 'strategy-planning-implementation', label: 'Strategy Implementation Planning' },
          { id: 'strategy-planning-monitoring', label: 'Strategic Plan Monitoring & Review' },
          { id: 'strategy-planning-risk-assessment', label: 'Strategic Risk Assessment' },
          { id: 'strategy-planning-stakeholder-alignment', label: 'Strategic Stakeholder Alignment' }
        ]
      }
    ];

    // Process the work types
    let totalAdded = 0;
    let totalSkipped = 0;

    console.log(`📦 Processing Final Batch 3 (Sales and Strategy)`);
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

    console.log('📊 FINAL BATCH SUMMARY:');
    console.log(`✅ Work types added: ${totalAdded}`);
    console.log(`⚠️  Work types skipped (already exist): ${totalSkipped}`);
    console.log('');

    // Final verification - run a quick analysis
    console.log('🔍 Running final verification...\n');

    const focusAreasWithCounts = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            _count: {
              select: { workTypes: true }
            }
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    let totalCategoriesChecked = 0;
    let categoriesWithEnoughTypes = 0;
    let categoriesStillNeedingMore = 0;

    console.log('📈 FINAL VERIFICATION RESULTS:');
    
    for (const focusArea of focusAreasWithCounts) {
      console.log(`\n🎯 ${focusArea.label}:`);
      
      for (const category of focusArea.workCategories) {
        totalCategoriesChecked++;
        const workTypeCount = category._count.workTypes;
        const hasEnough = workTypeCount >= 8;
        
        if (hasEnough) {
          categoriesWithEnoughTypes++;
        } else {
          categoriesStillNeedingMore++;
        }

        const status = hasEnough ? '✅' : '❌';
        console.log(`   ${status} ${category.label}: ${workTypeCount} work types`);
      }
    }

    console.log('\n📊 FINAL OVERALL SUMMARY:');
    console.log(`Total categories checked: ${totalCategoriesChecked}`);
    console.log(`✅ Categories with 8+ work types: ${categoriesWithEnoughTypes}`);
    console.log(`❌ Categories still needing more: ${categoriesStillNeedingMore}`);
    console.log(`📊 Success rate: ${((categoriesWithEnoughTypes / totalCategoriesChecked) * 100).toFixed(1)}%`);
    console.log('');

    if (categoriesStillNeedingMore === 0) {
      console.log('🎉 SUCCESS! All work categories now have at least 8 work types!');
    } else {
      console.log(`⚠️  ${categoriesStillNeedingMore} categories still need more work types.`);
    }

    console.log('\n✅ Final batch completed successfully!');

  } catch (error) {
    console.error('❌ Error adding work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingWorkTypesBatch3()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });