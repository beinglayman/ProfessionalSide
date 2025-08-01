const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOthersOrderingFinal() {
  try {
    console.log('🔄 Fixing Others ordering properly...');

    // Update Others categories to use 'zz' prefix to ensure they sort last
    const othersUpdates = [
      { focusAreaId: '01-development', newId: 'dev-zz-others' },
      { focusAreaId: '02-design', newId: 'design-zz-others' },
      { focusAreaId: '03-product-management', newId: 'pm-zz-others' },
      { focusAreaId: '04-system-architecture', newId: 'arch-zz-others' },
      { focusAreaId: '05-quality-assurance', newId: 'qa-zz-others' },
      { focusAreaId: '06-project-management', newId: 'proj-zz-others' },
      { focusAreaId: '07-executive', newId: 'exec-zz-others' },
      { focusAreaId: '99-others', newId: 'other-zz-others' }
    ];

    for (const update of othersUpdates) {
      // Find the current Others category
      const othersCategory = await prisma.workCategory.findFirst({
        where: {
          focusAreaId: update.focusAreaId,
          label: 'Others'
        }
      });

      if (othersCategory) {
        // First, update any work types that reference this category
        await prisma.workType.updateMany({
          where: { workCategoryId: othersCategory.id },
          data: { workCategoryId: update.newId }
        });

        // Then delete the old category
        await prisma.workCategory.delete({
          where: { id: othersCategory.id }
        });

        // Create the new category with correct ID
        await prisma.workCategory.create({
          data: {
            id: update.newId,
            label: 'Others',
            focusAreaId: update.focusAreaId
          }
        });

        console.log(`✅ Updated Others category for ${update.focusAreaId}: ${othersCategory.id} → ${update.newId}`);
      }
    }

    console.log('✅ Others ordering fixed properly!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error fixing Others ordering:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixOthersOrderingFinal();