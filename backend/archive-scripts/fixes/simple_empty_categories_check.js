const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function simpleEmptyCategoriesCheck() {
  try {
    console.log('🔍 SIMPLE CHECK: Empty Work Categories');
    
    // Quick query to find categories with 0 work types
    const emptyCategoriesQuery = await prisma.$queryRaw`
      SELECT 
        wc.id,
        wc.label as category_label,
        fa.label as focus_area_label,
        COUNT(wt.id) as work_type_count
      FROM "WorkCategory" wc
      LEFT JOIN "WorkType" wt ON wc.id = wt."workCategoryId"
      LEFT JOIN "FocusArea" fa ON wc."focusAreaId" = fa.id
      GROUP BY wc.id, wc.label, fa.label
      HAVING COUNT(wt.id) = 0
      ORDER BY fa.label, wc.label
    `;

    console.log(`❌ Empty categories found: ${emptyCategoriesQuery.length}`);
    
    if (emptyCategoriesQuery.length > 0) {
      console.log('\n📋 Categories WITHOUT work types:');
      emptyCategoriesQuery.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.focus_area_label} > ${cat.category_label} (${cat.id})`);
      });
    } else {
      console.log('✅ All categories have work types!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleEmptyCategoriesCheck();