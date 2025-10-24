const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Minimal seeding started...');
  
  // Focus Areas (required)
  const focusAreas = [
    { id: 'engineering', label: 'Engineering', description: 'Software development and technical roles' },
    { id: 'product', label: 'Product', description: 'Product management and strategy' },
    { id: 'design', label: 'Design', description: 'UX/UI and creative design' },
    { id: 'marketing', label: 'Marketing', description: 'Marketing and growth' },
    { id: 'sales', label: 'Sales', description: 'Sales and business development' },
    { id: 'operations', label: 'Operations', description: 'Operations and logistics' },
    { id: 'finance', label: 'Finance', description: 'Finance and accounting' },
    { id: 'people', label: 'People', description: 'HR and people operations' }
  ];
  
  console.log('📝 Seeding Focus Areas...');
  for (const fa of focusAreas) {
    await prisma.focusArea.upsert({
      where: { id: fa.id },
      update: {},
      create: fa
    });
  }
  console.log('✓ 8 Focus areas seeded');
  
  console.log('🎉 Minimal seeding completed!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Error during seeding:', e);
  process.exit(1);
});
