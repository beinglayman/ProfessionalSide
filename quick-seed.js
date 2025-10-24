const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Quick seeding focus areas...');
  
  const focusAreas = [
    { name: 'Engineering', slug: 'engineering' },
    { name: 'Product', slug: 'product' },
    { name: 'Design', slug: 'design' },
    { name: 'Marketing', slug: 'marketing' },
    { name: 'Sales', slug: 'sales' },
    { name: 'Operations', slug: 'operations' },
    { name: 'Finance', slug: 'finance' },
    { name: 'People', slug: 'people' }
  ];
  
  for (const fa of focusAreas) {
    await prisma.focusArea.upsert({
      where: { slug: fa.slug },
      update: {},
      create: fa
    });
  }
  
  console.log('✓ Focus areas seeded');
  await prisma.$disconnect();
}

seed().catch(console.error);
