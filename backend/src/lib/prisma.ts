import { PrismaClient } from '@prisma/client';

// Create Prisma client instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Initialize connection
prisma.$connect().then(() => {
  console.log('✅ Prisma client connected successfully');
}).catch((error) => {
  console.error('❌ Failed to connect Prisma client:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});