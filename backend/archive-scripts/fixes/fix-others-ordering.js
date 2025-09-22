const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOthersOrdering() {
  try {
    console.log('🔄 Fixing Others ordering in work categories...');

    // Update the ID of Others categories to ensure they appear at the bottom
    // The API sorts by ID, so we need Others to have IDs that sort last
    
    const categoriesWithOthers = [
      { focusAreaId: '01-development', currentId: 'dev-99-others' },
      { focusAreaId: '02-design', currentId: 'design-99-others' },
      { focusAreaId: '03-product-management', currentId: 'pm-99-others' },
      { focusAreaId: '04-system-architecture', currentId: 'arch-99-others' },
      { focusAreaId: '05-quality-assurance', currentId: 'qa-99-others' },
      { focusAreaId: '06-project-management', currentId: 'proj-99-others' },
      { focusAreaId: '07-executive', currentId: 'exec-99-others' },
      { focusAreaId: '99-others', currentId: 'other-99-others' }
    ];

    for (const category of categoriesWithOthers) {
      // Check if the Others category exists for this focus area
      const existingOthers = await prisma.workCategory.findFirst({
        where: {
          focusAreaId: category.focusAreaId,
          label: 'Others'
        }
      });

      if (existingOthers) {
        // Update the ID to ensure it sorts last
        await prisma.workCategory.update({
          where: { id: existingOthers.id },
          data: { id: category.currentId }
        });
        console.log(`✅ Updated Others category for ${category.focusAreaId}`);
      }
    }

    console.log('✅ Others ordering fixed!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error fixing Others ordering:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixOthersOrdering();