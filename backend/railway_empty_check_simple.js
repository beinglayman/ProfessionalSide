const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function railwayEmptyCheck() {
  try {
    console.log('🚂 RAILWAY EMPTY CATEGORIES CHECK');
    console.log('📅 Timestamp:', new Date().toISOString());
    
    // Simple query to find empty categories
    const result = await prisma.$queryRaw`
      SELECT 
        fa.label as focus_area,
        wc.label as category,
        wc.id as category_id,
        COUNT(wt.id) as work_type_count
      FROM "WorkCategory" wc
      LEFT JOIN "WorkType" wt ON wc.id = wt."workCategoryId"
      LEFT JOIN "FocusArea" fa ON wc."focusAreaId" = fa.id
      GROUP BY fa.label, wc.label, wc.id
      HAVING COUNT(wt.id) = 0
      ORDER BY fa.label, wc.label
    `;
    
    console.log(`❌ Empty categories found: ${result.length}`);
    
    if (result.length === 0) {
      console.log('✅ ALL categories have work types!');
    } else {
      console.log('\n📋 Categories WITHOUT work types:');
      result.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.focus_area} > ${cat.category} (${cat.category_id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

railwayEmptyCheck();