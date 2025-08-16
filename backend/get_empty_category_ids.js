const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function getEmptyCategoryIds() {
  try {
    console.log('🔍 GETTING EMPTY CATEGORY IDs FROM RAILWAY');
    
    // Find categories with 0 work types
    const emptyCategories = await prisma.workCategory.findMany({
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
    
    const actualEmptyCategories = emptyCategories.filter(cat => cat._count.workTypes === 0);
    
    console.log(`❌ Found ${actualEmptyCategories.length} empty categories:`);
    
    actualEmptyCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.focusArea.label} > ${cat.label}`);
      console.log(`   ID: "${cat.id}"`);
      console.log(`   Focus Area ID: "${cat.focusAreaId}"`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getEmptyCategoryIds();