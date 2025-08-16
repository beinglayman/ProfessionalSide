const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createOperationsWorkTypes() {
  try {
    console.log('🏗️  CREATING MISSING OPERATIONS WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('');

    // Get Operations focus area
    const operations = await prisma.focusArea.findFirst({
      where: { label: { contains: 'Operations', mode: 'insensitive' } }
    });

    if (!operations) {
      console.log('❌ Operations focus area not found');
      return;
    }

    console.log(`✅ Found Operations focus area: ${operations.id}`);

    // Get all Operations work categories
    const operationsCategories = await prisma.workCategory.findMany({
      where: { focusAreaId: operations.id },
      include: { workTypes: true }
    });

    console.log(`📋 Found ${operationsCategories.length} Operations categories`);

    // Define comprehensive Operations work types for all categories
    const operationsWorkTypes = [
      // Business Continuity
      { categoryId: 'operations-business-continuity', id: 'operations-bc-planning', label: 'Business Continuity Planning' },
      { categoryId: 'operations-business-continuity', id: 'operations-bc-disaster-recovery', label: 'Disaster Recovery' },
      { categoryId: 'operations-business-continuity', id: 'operations-bc-risk-assessment', label: 'Risk Assessment' },
      
      // Facilities Management
      { categoryId: 'operations-facilities', id: 'operations-facilities-management', label: 'Facility Operations' },
      { categoryId: 'operations-facilities', id: 'operations-facilities-maintenance', label: 'Facility Maintenance' },
      { categoryId: 'operations-facilities', id: 'operations-facilities-planning', label: 'Space Planning' },
      
      // Infrastructure
      { categoryId: 'operations-infrastructure', id: 'operations-infrastructure-management', label: 'Infrastructure Management' },
      { categoryId: 'operations-infrastructure', id: 'operations-infrastructure-monitoring', label: 'Infrastructure Monitoring' },
      { categoryId: 'operations-infrastructure', id: 'operations-infrastructure-optimization', label: 'Infrastructure Optimization' },
      
      // Operations Management
      { categoryId: 'operations-operations-management', id: 'operations-ops-process-improvement', label: 'Process Improvement' },
      { categoryId: 'operations-operations-management', id: 'operations-ops-workflow-design', label: 'Workflow Design' },
      { categoryId: 'operations-operations-management', id: 'operations-ops-performance-optimization', label: 'Performance Optimization' },
      
      // Process Management
      { categoryId: 'operations-process-management', id: 'operations-process-design', label: 'Process Design' },
      { categoryId: 'operations-process-management', id: 'operations-process-optimization', label: 'Process Optimization' },
      { categoryId: 'operations-process-management', id: 'operations-process-automation', label: 'Process Automation' },
      
      // Quality Management
      { categoryId: 'operations-quality-management', id: 'operations-quality-assurance', label: 'Quality Assurance' },
      { categoryId: 'operations-quality-management', id: 'operations-quality-control', label: 'Quality Control' },
      { categoryId: 'operations-quality-management', id: 'operations-quality-improvement', label: 'Quality Improvement' },
      
      // Supply Chain Management
      { categoryId: 'operations-supply-chain', id: 'operations-scm-procurement', label: 'Procurement Management' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-logistics', label: 'Logistics & Distribution' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-inventory', label: 'Inventory Management' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-planning', label: 'Demand Planning & Forecasting' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-sourcing', label: 'Strategic Sourcing' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-supplier', label: 'Supplier Relationship Management' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-optimization', label: 'Supply Chain Optimization' },
      { categoryId: 'operations-supply-chain', id: 'operations-scm-risk', label: 'Supply Chain Risk Management' },
      
      // Vendor Management
      { categoryId: 'operations-vendor-management', id: 'operations-vendor-selection', label: 'Vendor Selection' },
      { categoryId: 'operations-vendor-management', id: 'operations-vendor-onboarding', label: 'Vendor Onboarding' },
      { categoryId: 'operations-vendor-management', id: 'operations-vendor-performance', label: 'Vendor Performance Management' }
    ];

    console.log(`🎯 Creating ${operationsWorkTypes.length} Operations work types...`);
    console.log('');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const workType of operationsWorkTypes) {
      try {
        // Check if category exists
        const category = operationsCategories.find(cat => cat.id === workType.categoryId);
        if (!category) {
          console.log(`⚠️  Category not found: ${workType.categoryId} for ${workType.label}`);
          continue;
        }

        // Check if work type already exists
        const existing = await prisma.workType.findUnique({
          where: { id: workType.id }
        });

        if (existing) {
          console.log(`⚠️  Already exists: ${workType.label}`);
          skipped++;
          continue;
        }

        // Create work type
        await prisma.workType.create({
          data: {
            id: workType.id,
            label: workType.label,
            workCategoryId: workType.categoryId
          }
        });

        console.log(`✅ Created: ${workType.label} (${workType.categoryId})`);
        created++;

      } catch (error) {
        console.log(`❌ Failed to create ${workType.label}: ${error.message}`);
        errors++;
      }
    }

    console.log('');
    console.log('📊 OPERATIONS WORK TYPES CREATION SUMMARY:');
    console.log(`✅ Created: ${created}`);
    console.log(`⚠️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('');

    // Verify results by checking each category
    console.log('🔍 VERIFYING OPERATIONS CATEGORIES:');
    for (const category of operationsCategories) {
      const workTypes = await prisma.workType.findMany({
        where: { workCategoryId: category.id }
      });
      console.log(`   • ${category.label}: ${workTypes.length} work types`);
    }

    console.log('');
    if (created > 0) {
      console.log('🎉 SUCCESS: Operations work types created!');
      console.log('✅ Supply Chain Management should now have work types available');
    } else {
      console.log('⚠️  NO NEW WORK TYPES CREATED - they may already exist');
    }

  } catch (error) {
    console.error('❌ Error creating Operations work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
createOperationsWorkTypes()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });