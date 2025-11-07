#!/usr/bin/env node

/**
 * Script to clear Confluence OAuth token for a specific user
 * This forces the user to reconnect with the correct scopes
 */

const { PrismaClient } = require('@prisma/client');

async function clearConfluenceToken(userEmail) {
  const prisma = new PrismaClient();

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

    // Find and delete Confluence integration
    const deleted = await prisma.mCPIntegration.deleteMany({
      where: {
        userId: user.id,
        toolType: 'confluence'
      }
    });

    if (deleted.count > 0) {
      console.log(`✅ Successfully deleted Confluence integration for user ${user.email}`);
      console.log(`   Deleted ${deleted.count} integration(s)`);
    } else {
      console.log(`⚠️ No Confluence integration found for user ${user.email}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get user email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node clear-confluence-token.js <user-email>');
  console.log('Example: node clear-confluence-token.js honey@example.com');
  process.exit(1);
}

clearConfluenceToken(userEmail);