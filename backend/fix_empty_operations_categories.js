const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixEmptyOperationsCategories() {
  try {
    console.log('🔧 FIXING EMPTY OPERATIONS CATEGORIES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Add work types to Process Improvement and Quality Assurance categories');
    console.log('');

    // Define work types for Process Improvement category
    const processImprovementWorkTypes = [
      {
        id: 'operations-process-analysis',
        label: 'Process Analysis & Mapping',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-process-optimization',
        label: 'Process Optimization',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-workflow-design',
        label: 'Workflow Design & Implementation',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-automation-initiatives',
        label: 'Process Automation Initiatives',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-lean-methodology',
        label: 'Lean Methodology Implementation',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-six-sigma',
        label: 'Six Sigma Process Improvement',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-continuous-improvement',
        label: 'Continuous Improvement Programs',
        categoryId: 'operations-process-improvement'
      },
      {
        id: 'operations-efficiency-metrics',
        label: 'Efficiency Metrics & KPI Tracking',
        categoryId: 'operations-process-improvement'
      }
    ];

    // Define work types for Quality Assurance category
    const qualityAssuranceWorkTypes = [
      {
        id: 'operations-qa-testing-protocols',
        label: 'Quality Testing Protocols',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-standards-compliance',
        label: 'Quality Standards & Compliance',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-inspection-procedures',
        label: 'Quality Inspection Procedures',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-control-systems',
        label: 'Quality Control Systems',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-documentation',
        label: 'Quality Documentation & Records',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-training-programs',
        label: 'Quality Assurance Training',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-audit-management',
        label: 'Quality Audit Management',
        categoryId: 'operations-quality-assurance'
      },
      {
        id: 'operations-qa-corrective-actions',
        label: 'Corrective Action Implementation',
        categoryId: 'operations-quality-assurance'
      }
    ];

    console.log('🔍 Step 1: Verifying target categories exist...');
    
    // Check if categories exist
    const processImprovementCategory = await prisma.workCategory.findUnique({
      where: { id: 'operations-process-improvement' }
    });
    
    const qualityAssuranceCategory = await prisma.workCategory.findUnique({
      where: { id: 'operations-quality-assurance' }
    });

    if (!processImprovementCategory) {
      console.log('❌ Process Improvement category not found');
      return;
    }
    
    if (!qualityAssuranceCategory) {
      console.log('❌ Quality Assurance category not found');
      return;
    }

    console.log('✅ Both target categories found');
    console.log('');

    console.log('🔧 Step 2: Creating Process Improvement work types...');
    let processImprovementCreated = 0;
    
    for (const workType of processImprovementWorkTypes) {
      try {
        const existing = await prisma.workType.findUnique({
          where: { id: workType.id }
        });

        if (existing) {
          console.log(`   ⚠️  Already exists: ${workType.label}`);
          continue;
        }

        await prisma.workType.create({
          data: workType
        });
        
        console.log(`   ✅ Created: ${workType.label}`);
        processImprovementCreated++;
      } catch (error) {
        console.log(`   ❌ Failed to create ${workType.label}: ${error.message}`);
      }
    }

    console.log('');
    console.log('🔧 Step 3: Creating Quality Assurance work types...');
    let qualityAssuranceCreated = 0;
    
    for (const workType of qualityAssuranceWorkTypes) {
      try {
        const existing = await prisma.workType.findUnique({
          where: { id: workType.id }
        });

        if (existing) {
          console.log(`   ⚠️  Already exists: ${workType.label}`);
          continue;
        }

        await prisma.workType.create({
          data: workType
        });
        
        console.log(`   ✅ Created: ${workType.label}`);
        qualityAssuranceCreated++;
      } catch (error) {
        console.log(`   ❌ Failed to create ${workType.label}: ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 CREATION SUMMARY:');
    console.log(`✅ Process Improvement work types created: ${processImprovementCreated}`);
    console.log(`✅ Quality Assurance work types created: ${qualityAssuranceCreated}`);
    console.log(`📋 Total work types created: ${processImprovementCreated + qualityAssuranceCreated}`);
    console.log('');

    // Verify the categories now have work types
    console.log('🔍 Step 4: Verification...');
    
    const processImprovementCount = await prisma.workType.count({
      where: { workCategoryId: 'operations-process-improvement' }
    });
    
    const qualityAssuranceCount = await prisma.workType.count({
      where: { workCategoryId: 'operations-quality-assurance' }
    });

    console.log(`✅ Process Improvement now has: ${processImprovementCount} work types`);
    console.log(`✅ Quality Assurance now has: ${qualityAssuranceCount} work types`);
    console.log('');

    if (processImprovementCount > 0 && qualityAssuranceCount > 0) {
      console.log('🎉 SUCCESS: Both categories now have work types!');
      console.log('✅ Empty categories fixed - Operations taxonomy complete');
    } else {
      console.log('⚠️  WARNING: Some categories may still be empty');
    }

  } catch (error) {
    console.error('❌ Error fixing empty Operations categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixEmptyOperationsCategories()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });