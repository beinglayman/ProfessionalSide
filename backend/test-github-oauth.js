#!/usr/bin/env node

/**
 * Test script for GitHub OAuth integration
 * This tests the OAuth service directly without Express routes
 */

const { MCPOAuthService } = require('./dist/services/mcp/mcp-oauth.service');

async function testGitHubOAuth() {
  console.log('🧪 Testing GitHub OAuth Integration\n');
  console.log('================================\n');

  try {
    // Initialize OAuth service
    console.log('1. Initializing OAuth Service...');
    const oauthService = new MCPOAuthService();
    console.log('✅ OAuth Service initialized\n');

    // Check available tools
    console.log('2. Checking available tools...');
    const availableTools = oauthService.getAvailableTools();
    console.log('Available tools:', availableTools);
    console.log('GitHub available:', availableTools.includes('github') ? '✅' : '❌');
    console.log('');

    // Check if GitHub is configured
    console.log('3. Checking GitHub configuration...');
    const isGitHubAvailable = oauthService.isToolAvailable('github');
    console.log('GitHub tool available:', isGitHubAvailable ? '✅' : '❌');
    console.log('');

    // Generate authorization URL
    console.log('4. Generating GitHub OAuth URL...');
    const testUserId = 'test-user-123';
    const authData = oauthService.getAuthorizationUrl(testUserId, 'github');

    if (authData) {
      console.log('✅ OAuth URL generated successfully!\n');
      console.log('Authorization URL:', authData.url);
      console.log('State token:', authData.state);
      console.log('');

      // Parse the URL to verify it's correct
      const url = new URL(authData.url);
      console.log('5. URL Components:');
      console.log('- Host:', url.hostname);
      console.log('- Path:', url.pathname);
      console.log('- Client ID:', url.searchParams.get('client_id'));
      console.log('- Redirect URI:', url.searchParams.get('redirect_uri'));
      console.log('- Scope:', url.searchParams.get('scope'));
      console.log('- State:', url.searchParams.get('state'));
      console.log('');

      console.log('✅ GitHub OAuth is properly configured!');
      console.log('');
      console.log('To test the full flow:');
      console.log('1. Visit this URL in your browser:', authData.url);
      console.log('2. Authorize the GitHub app');
      console.log('3. You will be redirected to:', url.searchParams.get('redirect_uri'));
    } else {
      console.log('❌ Failed to generate OAuth URL');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testGitHubOAuth();