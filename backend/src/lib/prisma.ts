import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client
 *
 * This ensures only one Prisma Client instance is created and reused
 * across the application, preventing connection pool exhaustion.
 *
 * Important for MCP services that may be instantiated multiple times
 * when fetching from multiple tools simultaneously.
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
