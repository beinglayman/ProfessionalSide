const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Helper function to generate skill slug
function generateSkillSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

async function fixEmptyCategoriesDynamic() {
  try {
    console.log('🔧 DYNAMIC FIX: Empty Categories Across ALL Focus Areas');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Find and fix ALL empty categories by matching labels');
    console.log('');

    // Step 1: Find ALL empty categories
    console.log('🔍 Step 1: Finding all empty categories...');
    
    const allCategories = await prisma.workCategory.findMany({
      include: {
        focusArea: true,
        _count: {
          select: { workTypes: true }
        }
      },
      orderBy: [
        { focusArea: { label: 'asc' } },
        { label: 'asc' }
      ]
    });
    
    const emptyCategories = allCategories.filter(cat => cat._count.workTypes === 0);
    
    console.log(`📊 Found ${allCategories.length} total categories`);
    console.log(`❌ Found ${emptyCategories.length} empty categories`);
    console.log('');
    
    if (emptyCategories.length === 0) {
      console.log('🎉 No empty categories found - all good!');
      return;
    }
    
    console.log('📋 Empty categories to fix:');
    emptyCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.focusArea.label} > ${cat.label} (${cat.id})`);
    });
    console.log('');

    // Step 2: Define work types for each empty category
    console.log('🔧 Step 2: Creating work types for empty categories...');
    
    const workTypeTemplates = {
      'Process Improvement': [
        { id: 'process-analysis-mapping', label: 'Process Analysis & Mapping' },
        { id: 'process-optimization', label: 'Process Optimization' },
        { id: 'workflow-design', label: 'Workflow Design & Implementation' },
        { id: 'process-automation', label: 'Process Automation Initiatives' },
        { id: 'lean-methodology', label: 'Lean Methodology Implementation' },
        { id: 'six-sigma', label: 'Six Sigma Process Improvement' },
        { id: 'continuous-improvement', label: 'Continuous Improvement Programs' },
        { id: 'efficiency-metrics', label: 'Efficiency Metrics & KPI Tracking' }
      ],
      'Quality Assurance': [
        { id: 'qa-testing-protocols', label: 'Quality Testing Protocols' },
        { id: 'qa-standards-compliance', label: 'Quality Standards & Compliance' },
        { id: 'qa-inspection-procedures', label: 'Quality Inspection Procedures' },
        { id: 'qa-control-systems', label: 'Quality Control Systems' },
        { id: 'qa-documentation', label: 'Quality Documentation & Records' },
        { id: 'qa-training-programs', label: 'Quality Assurance Training' },
        { id: 'qa-audit-management', label: 'Quality Audit Management' },
        { id: 'qa-corrective-actions', label: 'Corrective Action Implementation' }
      ]
    };

    let totalWorkTypesCreated = 0;
    
    for (const category of emptyCategories) {
      console.log(`📌 Processing: ${category.focusArea.label} > ${category.label}`);
      
      // Find matching template
      let template = null;
      let templateKey = null;
      
      for (const [key, workTypes] of Object.entries(workTypeTemplates)) {
        if (category.label.toLowerCase().includes(key.toLowerCase()) || 
            key.toLowerCase().includes(category.label.toLowerCase())) {
          template = workTypes;
          templateKey = key;
          break;
        }
      }
      
      if (!template) {
        // Create generic work types if no template matches
        template = [
          { id: 'general-management', label: `${category.label} Management` },
          { id: 'general-strategy', label: `${category.label} Strategy` },
          { id: 'general-implementation', label: `${category.label} Implementation` },
          { id: 'general-optimization', label: `${category.label} Optimization` }
        ];
        templateKey = 'Generic';
      }
      
      console.log(`   🎯 Using ${templateKey} template (${template.length} work types)`);
      
      let categoryWorkTypesCreated = 0;
      
      for (const workTypeTemplate of template) {
        try {
          // Create unique ID with category prefix
          const uniqueId = `${category.id}-${workTypeTemplate.id}`;
          
          const existingWorkType = await prisma.workType.findUnique({
            where: { id: uniqueId }
          });
          
          if (existingWorkType) {
            console.log(`   ⚠️  Already exists: ${workTypeTemplate.label}`);
            continue;
          }
          
          await prisma.workType.create({
            data: {
              id: uniqueId,
              label: workTypeTemplate.label,
              workCategoryId: category.id
            }
          });
          
          console.log(`   ✅ Created: ${workTypeTemplate.label}`);
          categoryWorkTypesCreated++;
          totalWorkTypesCreated++;
          
        } catch (error) {
          console.log(`   ❌ Failed to create ${workTypeTemplate.label}: ${error.message}`);
        }
      }
      
      console.log(`   📊 Created ${categoryWorkTypesCreated} work types for ${category.label}`);
      console.log('');
    }

    console.log('📊 DYNAMIC FIX SUMMARY:');
    console.log(`✅ Empty categories processed: ${emptyCategories.length}`);
    console.log(`✅ Total work types created: ${totalWorkTypesCreated}`);
    console.log('');

    // Step 3: Verification
    console.log('🔍 Step 3: Final verification...');
    
    const finalCheck = await prisma.workCategory.findMany({
      include: {
        focusArea: true,
        _count: {
          select: { workTypes: true }
        }
      },
      orderBy: [
        { focusArea: { label: 'asc' } },
        { label: 'asc' }
      ]
    });
    
    const finalEmptyCategories = finalCheck.filter(cat => cat._count.workTypes === 0);
    
    console.log(`📊 Final check: ${finalEmptyCategories.length} empty categories remaining`);
    
    if (finalEmptyCategories.length === 0) {
      console.log('🎉 SUCCESS: All categories now have work types!');
      console.log('✅ Empty categories fix completed successfully');
    } else {
      console.log('⚠️  Still empty:');
      finalEmptyCategories.forEach(cat => {
        console.log(`   • ${cat.focusArea.label} > ${cat.label} (${cat.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error in dynamic fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixEmptyCategoriesDynamic()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });