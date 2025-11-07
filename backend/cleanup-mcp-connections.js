/**
 * MCP Connection Cleanup Script
 *
 * This script removes all MCP OAuth connections from the database,
 * allowing for a fresh start with correct OAuth scopes.
 *
 * Run this on Azure Web App via: node cleanup-mcp-connections.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupMCPConnections() {
  console.log('\n=== MCP Connection Cleanup ===\n');

  try {
    // Get count before deletion
    const beforeCount = await prisma.mCPConnection.count();
    console.log(`Found ${beforeCount} MCP connection(s) to delete\n`);

    if (beforeCount === 0) {
      console.log('✅ No MCP connections found. Database is already clean.\n');
      return;
    }

    // List all connections before deletion
    const connections = await prisma.mCPConnection.findMany({
      select: {
        id: true,
        toolType: true,
        userId: true,
        createdAt: true,
        metadata: true
      }
    });

    console.log('Connections to be deleted:');
    connections.forEach((conn, i) => {
      console.log(`  ${i + 1}. ${conn.toolType} (User ${conn.userId}) - Created: ${conn.createdAt}`);
      if (conn.toolType === 'CONFLUENCE' || conn.toolType === 'JIRA') {
        console.log(`     Cloud ID: ${conn.metadata?.cloudId || 'N/A'}`);
      }
    });

    console.log('\n⚠️  Proceeding with deletion in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all MCP connections
    const result = await prisma.mCPConnection.deleteMany({});

    console.log(`\n✅ Successfully deleted ${result.count} MCP connection(s)`);
    console.log('\nNext steps:');
    console.log('1. Ensure backend is running with classic OAuth scopes');
    console.log('2. Revoke access at https://id.atlassian.com/manage-profile/security/connected-apps');
    console.log('3. Reconnect Confluence and Jira in InChronicle');
    console.log('4. Verify activities are fetched correctly\n');

  } catch (error) {
    console.error('❌ Error cleaning up MCP connections:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMCPConnections();
