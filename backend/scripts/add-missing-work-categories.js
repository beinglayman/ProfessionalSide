// Script to add missing work categories for focus areas with less than 8 categories
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Additional work categories to add
const additionalCategories = {
  // Finance (currently has 1, adding 7 more)
  'finance': [
    { id: 'finance-budgeting', label: 'Budgeting & Planning', description: 'Budget planning, forecasting, and variance analysis' },
    { id: 'finance-financial-analysis', label: 'Financial Analysis', description: 'Financial modeling, ratio analysis, and performance metrics' },
    { id: 'finance-investment', label: 'Investment Management', description: 'Investment decisions, portfolio management, and capital allocation' },
    { id: 'finance-risk-management', label: 'Risk Management', description: 'Financial risk assessment and mitigation strategies' },
    { id: 'finance-tax-planning', label: 'Tax Planning', description: 'Tax strategy, compliance, and optimization' },
    { id: 'finance-treasury', label: 'Treasury Management', description: 'Cash flow management, banking relationships, and liquidity' },
    { id: 'finance-audit', label: 'Audit & Compliance', description: 'Internal auditing, regulatory compliance, and controls' }
  ],

  // HR (currently has 1, adding 7 more)
  'hr': [
    { id: 'hr-employee-relations', label: 'Employee Relations', description: 'Employee engagement, conflict resolution, and workplace culture' },
    { id: 'hr-performance-management', label: 'Performance Management', description: 'Performance reviews, goal setting, and development planning' },
    { id: 'hr-compensation', label: 'Compensation & Benefits', description: 'Salary planning, benefits administration, and reward systems' },
    { id: 'hr-learning-development', label: 'Learning & Development', description: 'Training programs, career development, and skill building' },
    { id: 'hr-policy-compliance', label: 'Policy & Compliance', description: 'HR policies, legal compliance, and workplace regulations' },
    { id: 'hr-workforce-planning', label: 'Workforce Planning', description: 'Headcount planning, organizational design, and succession planning' },
    { id: 'hr-diversity-inclusion', label: 'Diversity & Inclusion', description: 'DEI initiatives, inclusive practices, and cultural transformation' }
  ],

  // Leadership (currently has 0, adding 8)
  'leadership': [
    { id: 'leadership-team-management', label: 'Team Management', description: 'Team building, delegation, and people management' },
    { id: 'leadership-strategic-planning', label: 'Strategic Leadership', description: 'Vision setting, strategic decision making, and organizational direction' },
    { id: 'leadership-change-management', label: 'Change Management', description: 'Leading organizational change, transformation, and adaptation' },
    { id: 'leadership-coaching-mentoring', label: 'Coaching & Mentoring', description: 'Employee development, coaching, and leadership mentoring' },
    { id: 'leadership-communication', label: 'Executive Communication', description: 'Leadership communication, presentations, and stakeholder management' },
    { id: 'leadership-decision-making', label: 'Decision Making', description: 'Strategic decisions, problem solving, and critical thinking' },
    { id: 'leadership-culture-building', label: 'Culture Building', description: 'Organizational culture, values, and workplace environment' },
    { id: 'leadership-crisis-management', label: 'Crisis Management', description: 'Crisis response, risk mitigation, and emergency leadership' }
  ],

  // Legal (currently has 1, adding 7 more)
  'legal': [
    { id: 'legal-regulatory-compliance', label: 'Regulatory Compliance', description: 'Regulatory adherence, compliance monitoring, and legal risk management' },
    { id: 'legal-intellectual-property', label: 'Intellectual Property', description: 'Patents, trademarks, copyrights, and IP strategy' },
    { id: 'legal-corporate-governance', label: 'Corporate Governance', description: 'Board governance, corporate structure, and legal entity management' },
    { id: 'legal-litigation', label: 'Litigation & Disputes', description: 'Legal disputes, litigation management, and conflict resolution' },
    { id: 'legal-privacy-data', label: 'Privacy & Data Protection', description: 'Data privacy laws, GDPR compliance, and information security' },
    { id: 'legal-employment-law', label: 'Employment Law', description: 'Labor law compliance, employment contracts, and workplace legal issues' },
    { id: 'legal-mergers-acquisitions', label: 'Mergers & Acquisitions', description: 'M&A transactions, due diligence, and corporate transactions' }
  ],

  // Operations (currently has 2, adding 6 more)
  'operations': [
    { id: 'operations-process-improvement', label: 'Process Improvement', description: 'Process optimization, efficiency improvements, and operational excellence' },
    { id: 'operations-supply-chain', label: 'Supply Chain Management', description: 'Vendor management, procurement, and supply chain optimization' },
    { id: 'operations-quality-assurance', label: 'Quality Assurance', description: 'Quality control, process standardization, and compliance monitoring' },
    { id: 'operations-facilities', label: 'Facilities Management', description: 'Office management, facility operations, and workplace services' },
    { id: 'operations-vendor-management', label: 'Vendor Management', description: 'Supplier relationships, contract management, and vendor performance' },
    { id: 'operations-business-continuity', label: 'Business Continuity', description: 'Disaster recovery, business continuity planning, and risk mitigation' }
  ],

  // Sales (currently has 4, adding 4 more)
  'sales': [
    { id: 'sales-lead-generation', label: 'Lead Generation', description: 'Lead qualification, demand generation, and pipeline development' },
    { id: 'sales-customer-retention', label: 'Customer Retention', description: 'Customer success, retention strategies, and churn prevention' },
    { id: 'sales-sales-training', label: 'Sales Training', description: 'Sales enablement, training programs, and skill development' },
    { id: 'sales-partnership', label: 'Partnership & Channels', description: 'Channel partnerships, partner management, and indirect sales' }
  ],

  // Strategy (currently has 0, adding 8)
  'strategy': [
    { id: 'strategy-business-strategy', label: 'Business Strategy', description: 'Business model development, competitive strategy, and market positioning' },
    { id: 'strategy-market-research', label: 'Market Research', description: 'Market analysis, competitive intelligence, and industry research' },
    { id: 'strategy-strategic-planning', label: 'Strategic Planning', description: 'Long-term planning, goal setting, and strategic roadmaps' },
    { id: 'strategy-mergers-acquisitions', label: 'M&A Strategy', description: 'Acquisition strategy, merger planning, and integration management' },
    { id: 'strategy-innovation', label: 'Innovation Strategy', description: 'Innovation planning, R&D strategy, and technology roadmaps' },
    { id: 'strategy-transformation', label: 'Digital Transformation', description: 'Digital strategy, transformation initiatives, and technology adoption' },
    { id: 'strategy-partnerships', label: 'Partnership Strategy', description: 'Strategic partnerships, alliance management, and ecosystem development' },
    { id: 'strategy-competitive-analysis', label: 'Competitive Analysis', description: 'Competitor research, market positioning, and competitive intelligence' }
  ]
};

async function addMissingWorkCategories() {
  console.log('🏗️ Adding missing work categories...');
  
  let categoriesAdded = 0;
  let categoriesSkipped = 0;

  for (const [focusAreaId, categories] of Object.entries(additionalCategories)) {
    console.log(`\n📂 Processing focus area: ${focusAreaId}`);
    
    // Verify focus area exists
    const focusArea = await prisma.focusArea.findUnique({
      where: { id: focusAreaId }
    });
    
    if (!focusArea) {
      console.log(`❌ Focus area not found: ${focusAreaId}`);
      continue;
    }
    
    for (const category of categories) {
      // Check if category already exists
      const existingCategory = await prisma.workCategory.findUnique({
        where: { id: category.id }
      });
      
      if (existingCategory) {
        console.log(`  ⏭️  Skipped (already exists): ${category.label}`);
        categoriesSkipped++;
      } else {
        // Create the work category
        await prisma.workCategory.create({
          data: {
            id: category.id,
            label: category.label,
            description: category.description,
            focusAreaId: focusAreaId
          }
        });
        console.log(`  ➕ Added: ${category.label}`);
        categoriesAdded++;
      }
    }
  }

  console.log(`\n🎯 Summary:`);
  console.log(`   ➕ Categories added: ${categoriesAdded}`);
  console.log(`   ⏭️  Categories skipped: ${categoriesSkipped}`);
  console.log(`\n✅ Work categories addition completed!`);
}

async function main() {
  try {
    await addMissingWorkCategories();
  } catch (error) {
    console.error('❌ Error adding work categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  });