#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function forceReconnectConfluence() {
  const prisma = new PrismaClient();
  const userEmail = 'honeyarora@gmail.com';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error(`User not found with email: ${userEmail}`);
      return;
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);

    // Delete ALL Confluence integrations (including grouped ones)
    const deleted = await prisma.mCPIntegration.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { toolType: 'confluence' },
          { toolType: 'atlassian' },
          { toolType: { contains: 'confluence' } }
        ]
      }
    });

    console.log(`✅ Deleted ${deleted.count} Confluence-related integration(s)`);
    console.log('✅ Please reconnect Confluence from the frontend now');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceReconnectConfluence();
