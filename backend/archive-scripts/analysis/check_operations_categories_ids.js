const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkOperationsCategoryIds() {
  try {
    console.log('🔍 CHECKING OPERATIONS CATEGORY IDs IN RAILWAY');
    
    const operationsCategories = await prisma.workCategory.findMany({
      where: {
        focusArea: {
          label: { contains: 'Operation', mode: 'insensitive' }
        }
      },
      include: {
        focusArea: true,
        _count: {
          select: { workTypes: true }
        }
      },
      orderBy: { label: 'asc' }
    });
    
    console.log('📋 Operations Categories in Railway:');
    operationsCategories.forEach(cat => {
      console.log(`• ${cat.label} (${cat.id}) - ${cat._count.workTypes} work types`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationsCategoryIds();