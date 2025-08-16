const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMissingCategories() {
  try {
    console.log('🔄 Adding missing work categories to focus areas...\n');

    // Define the missing categories for each focus area
    const missingCategories = [
      // Leadership (needs 1 more)
      {
        focusAreaId: 'leadership',
        focusAreaLabel: 'Leadership',
        categories: [
          {
            id: 'leadership-crisis-management',
            label: 'Crisis Management'
          }
        ]
      },
      // Legal (needs 1 more)
      {
        focusAreaId: 'legal',
        focusAreaLabel: 'Legal',
        categories: [
          {
            id: 'legal-securities-law',
            label: 'Securities Law'
          }
        ]
      },
      // Strategy (needs 1 more)
      {
        focusAreaId: 'strategy',
        focusAreaLabel: 'Strategy',
        categories: [
          {
            id: 'strategy-digital-transformation',
            label: 'Digital Transformation'
          }
        ]
      }
    ];

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const focusAreaData of missingCategories) {
      console.log(`📌 Processing ${focusAreaData.focusAreaLabel} focus area...`);
      
      // Verify focus area exists
      const focusArea = await prisma.focusArea.findUnique({
        where: { id: focusAreaData.focusAreaId }
      });

      if (!focusArea) {
        console.log(`❌ Focus area ${focusAreaData.focusAreaId} not found, skipping...`);
        continue;
      }

      for (const category of focusAreaData.categories) {
        // Check if category already exists
        const existingCategory = await prisma.workCategory.findUnique({
          where: { id: category.id }
        });

        if (existingCategory) {
          console.log(`   ⚠️  Category "${category.label}" already exists, skipping...`);
          totalSkipped++;
          continue;
        }

        // Add the category
        try {
          await prisma.workCategory.create({
            data: {
              id: category.id,
              label: category.label,
              focusAreaId: focusAreaData.focusAreaId
            }
          });

          console.log(`   ✅ Added category: "${category.label}" (${category.id})`);
          totalAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add "${category.label}": ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 SUMMARY:');
    console.log(`✅ Categories added: ${totalAdded}`);
    console.log(`⚠️  Categories skipped (already exist): ${totalSkipped}`);
    console.log('');

    // Verify the results by running the analysis again
    console.log('🔍 Verifying results...\n');

    const focusAreasWithCategories = await prisma.focusArea.findMany({
      include: {
        _count: {
          select: { workCategories: true }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log('📈 UPDATED FOCUS AREA COUNTS:');
    let allHaveEnough = true;

    for (const focusArea of focusAreasWithCategories) {
      const count = focusArea._count.workCategories;
      const hasEnough = count >= 8;
      const status = hasEnough ? '✅' : '❌';
      
      if (!hasEnough) {
        allHaveEnough = false;
      }

      console.log(`${status} ${focusArea.label}: ${count} categories`);
    }

    console.log('');
    if (allHaveEnough) {
      console.log('🎉 SUCCESS! All focus areas now have at least 8 work categories!');
    } else {
      console.log('⚠️  Some focus areas still need more categories.');
    }

    console.log('\n✅ Operation completed successfully!');

  } catch (error) {
    console.error('❌ Error adding missing categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingCategories()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });