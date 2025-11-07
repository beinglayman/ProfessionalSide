#!/usr/bin/env node
/**
 * Clear Confluence OAuth Token
 *
 * This script clears the existing Confluence OAuth token from the database.
 * This is necessary after updating OAuth scopes to force users to re-authorize
 * with the new scope list.
 *
 * Usage: node scripts/clear-confluence-oauth.js [userId]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearConfluenceToken(userId) {
  try {
    console.log('🔧 Clearing Confluence OAuth token...');
    console.log(`User ID: ${userId || 'ALL USERS'}`);

    // Build query
    const where = {
      toolType: 'confluence'
    };

    if (userId) {
      where.userId = userId;
    }

    // Clear OAuth tokens and update integration status
    const updatedIntegrations = await prisma.mCPIntegration.updateMany({
      where,
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        encryptedTokens: null,
        scope: null,
        isConnected: false,
        lastSyncAt: null,
        connectedAt: null
      }
    });

    console.log(`✅ Cleared tokens and updated ${updatedIntegrations.count} integration(s) to disconnected`);

    console.log('\n📋 Next steps:');
    console.log('1. User should disconnect Confluence in the UI (if visible)');
    console.log('2. User should reconnect Confluence');
    console.log('3. New OAuth flow will request updated scopes:');
    console.log('   - read:page:confluence');
    console.log('   - read:blogpost:confluence');
    console.log('   - read:space:confluence');
    console.log('   - read:comment:confluence');
    console.log('   - read:user:confluence');
    console.log('   - read:me');
    console.log('   - offline_access');

  } catch (error) {
    console.error('❌ Error clearing Confluence token:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const userId = process.argv[2];

clearConfluenceToken(userId)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
