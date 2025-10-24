/**
 * Clear all MCP OAuth tokens from database
 * Use this script if tokens were encrypted with wrong key and need to be re-initialized
 *
 * Usage: node clear-mcp-tokens.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearMCPTokens() {
  console.log('🧹 Starting MCP token cleanup...\n');

  try {
    // Get count of existing OAuth credentials before deletion
    const beforeCount = await prisma.oAuthCredential.count();
    console.log(`📊 Found ${beforeCount} OAuth credentials in database\n`);

    if (beforeCount === 0) {
      console.log('✅ No OAuth credentials to clear. Database is clean.');
      return;
    }

    // Show which users and tools will be affected
    const credentials = await prisma.oAuthCredential.findMany({
      select: {
        userId: true,
        toolType: true,
        connectedAt: true
      }
    });

    console.log('🔍 OAuth credentials to be cleared:');
    credentials.forEach(cred => {
      console.log(`   - User: ${cred.userId}, Tool: ${cred.toolType}, Connected: ${cred.connectedAt}`);
    });

    console.log('\n⚠️  WARNING: This will delete all OAuth tokens.');
    console.log('Users will need to reconnect all tools via Settings → Integrations.\n');

    // Delete all OAuth credentials
    const result = await prisma.oAuthCredential.deleteMany({});

    console.log(`\n✅ Deleted ${result.count} OAuth credentials successfully!\n`);
    console.log('📝 Next steps:');
    console.log('   1. Go to: https://professionalside-production.up.railway.app/settings/integrations');
    console.log('   2. Reconnect each tool (GitHub, Jira, Figma, Outlook, Confluence, Slack, Teams)');
    console.log('   3. New tokens will be encrypted with the current ENCRYPTION_KEY\n');

  } catch (error) {
    console.error('❌ Error clearing MCP tokens:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearMCPTokens()
  .then(() => {
    console.log('✨ Token cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Token cleanup failed:', error);
    process.exit(1);
  });
