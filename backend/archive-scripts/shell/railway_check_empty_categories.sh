#!/bin/bash

echo "🚂 RAILWAY PRODUCTION CHECK: Empty Categories Across ALL Focus Areas"
echo "📅 Timestamp: $(date)"
echo "🎯 Goal: Find any work category that has 0 work types"
echo ""

# Use railway run to execute a simple database query within Railway environment
railway run node -e "
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function quickCheck() {
  try {
    console.log('📋 Checking all work categories in Railway production...');
    
    // Simple query to count work types per category
    const result = await prisma.\$queryRaw\`
      SELECT 
        fa.label as focus_area,
        wc.label as category,
        wc.id as category_id,
        COUNT(wt.id) as work_type_count
      FROM \"WorkCategory\" wc
      LEFT JOIN \"WorkType\" wt ON wc.id = wt.\"workCategoryId\"
      LEFT JOIN \"FocusArea\" fa ON wc.\"focusAreaId\" = fa.id
      GROUP BY fa.label, wc.label, wc.id
      ORDER BY fa.label, wc.label
    \`;
    
    const emptyCategories = result.filter(cat => parseInt(cat.work_type_count) === 0);
    const totalCategories = result.length;
    
    console.log(\`\\n📊 RAILWAY PRODUCTION RESULTS:\`);
    console.log(\`📋 Total categories: \${totalCategories}\`);
    console.log(\`❌ Empty categories: \${emptyCategories.length}\`);
    console.log(\`✅ Categories with work types: \${totalCategories - emptyCategories.length}\`);
    
    if (emptyCategories.length === 0) {
      console.log('\\n🎉 PERFECT! All categories have work types!');
    } else {
      console.log('\\n❌ EMPTY CATEGORIES FOUND:');
      emptyCategories.forEach((cat, index) => {
        console.log(\`\${index + 1}. \${cat.focus_area} > \${cat.category} (\${cat.category_id})\`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

quickCheck();"