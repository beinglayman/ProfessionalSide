/**
 * Direct Confluence OAuth Token Testing Script
 * Tests OAuth token against Confluence API endpoints to identify exact issue
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function testConfluenceToken() {
  console.log('\n=== Confluence OAuth Token Tester ===\n');

  // Get token from user
  const accessToken = await question('Enter your Confluence OAuth access token: ');
  const cloudId = await question('Enter your Atlassian Cloud ID (from https://api.atlassian.com/oauth/token/accessible-resources): ');

  console.log('\n--- Testing Token ---\n');

  const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  };

  // Test 1: Check accessible resources (should work with any valid token)
  console.log('Test 1: Accessible Resources...');
  try {
    const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', { headers });
    console.log('✅ SUCCESS - Accessible Resources');
    console.log('Resources:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ FAILED - Accessible Resources');
    console.log('Error:', error.response?.status, error.response?.data || error.message);
    console.log('\nToken may be expired or invalid. Please reconnect.\n');
    rl.close();
    return;
  }

  // Test 2: v1 API - Get spaces (classic scopes: read:confluence-space.summary)
  console.log('\nTest 2: v1 API - Get Spaces...');
  try {
    const response = await axios.get(`${baseUrl}/wiki/rest/api/space`, {
      headers,
      params: { limit: 5 }
    });
    console.log('✅ SUCCESS - v1 Spaces');
    console.log('Spaces found:', response.data.results?.length || 0);
    if (response.data.results?.length > 0) {
      console.log('Space names:', response.data.results.map(s => s.name).join(', '));
    }
  } catch (error) {
    console.log('❌ FAILED - v1 Spaces');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.status === 401) {
      console.log('\n⚠️  401 Error: Scope mismatch or missing read:confluence-space.summary');
    }
  }

  // Test 3: v1 API - Get content (classic scopes: read:confluence-content.all)
  console.log('\nTest 3: v1 API - Get Recent Content...');
  try {
    const response = await axios.get(`${baseUrl}/wiki/rest/api/content`, {
      headers,
      params: {
        limit: 10,
        orderby: 'lastmodified desc',
        expand: 'version,space,history.lastUpdated'
      }
    });
    console.log('✅ SUCCESS - v1 Content');
    console.log('Content items found:', response.data.results?.length || 0);
    if (response.data.results?.length > 0) {
      response.data.results.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title} (${item.type}) - Last modified: ${item.version?.when}`);
      });
    }
  } catch (error) {
    console.log('❌ FAILED - v1 Content');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.status === 401) {
      console.log('\n⚠️  401 Error: Scope mismatch or missing read:confluence-content.all');
    }
  }

  // Test 4: v2 API - Get pages (granular scopes: read:page:confluence)
  console.log('\nTest 4: v2 API - Get Pages...');
  try {
    const response = await axios.get(`${baseUrl}/wiki/api/v2/pages`, {
      headers,
      params: { limit: 10 }
    });
    console.log('✅ SUCCESS - v2 Pages');
    console.log('Pages found:', response.data.results?.length || 0);
  } catch (error) {
    console.log('❌ FAILED - v2 Pages');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.status === 401) {
      console.log('\n⚠️  401 Error: v2 API requires granular scopes (read:page:confluence)');
      console.log('Classic scopes (read:confluence-content.all) work better with v1 API');
    }
  }

  // Test 5: Check token scopes (decode JWT)
  console.log('\nTest 5: Token Scope Analysis...');
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('Token scopes:', payload.scope);
      console.log('\nScope analysis:');
      const scopes = payload.scope.split(' ');

      // Check for classic scopes
      const hasClassicContent = scopes.includes('read:confluence-content.all');
      const hasClassicSpace = scopes.includes('read:confluence-space.summary');
      const hasClassicUser = scopes.includes('read:confluence-user');

      // Check for granular scopes
      const hasGranularPage = scopes.includes('read:page:confluence');
      const hasGranularSpace = scopes.includes('read:space:confluence');
      const hasGranularComment = scopes.includes('read:comment:confluence');

      console.log(`  Classic Content Scope: ${hasClassicContent ? '✅' : '❌'}`);
      console.log(`  Classic Space Scope: ${hasClassicSpace ? '✅' : '❌'}`);
      console.log(`  Classic User Scope: ${hasClassicUser ? '✅' : '❌'}`);
      console.log(`  Granular Page Scope: ${hasGranularPage ? '✅' : '❌'}`);
      console.log(`  Granular Space Scope: ${hasGranularSpace ? '✅' : '❌'}`);
      console.log(`  Granular Comment Scope: ${hasGranularComment ? '✅' : '❌'}`);

      // Check for mixing
      const hasMixing = (hasClassicContent || hasClassicSpace || hasClassicUser) &&
                       (hasGranularPage || hasGranularSpace || hasGranularComment);

      if (hasMixing) {
        console.log('\n⚠️  WARNING: Token has BOTH classic AND granular scopes!');
        console.log('This causes "scope does not match" errors.');
        console.log('Solution: Use only classic scopes for both Jira and Confluence.');
      }

      // Recommendation
      console.log('\n--- Recommendation ---');
      if (hasClassicContent && hasClassicSpace) {
        console.log('✅ Token has correct classic scopes for v1 API');
        console.log('Use v1 endpoints: /wiki/rest/api/content, /wiki/rest/api/space');
      } else if (hasGranularPage && hasGranularSpace) {
        console.log('✅ Token has granular scopes for v2 API');
        console.log('Use v2 endpoints: /wiki/api/v2/pages, /wiki/api/v2/spaces');
      } else {
        console.log('❌ Token missing required scopes');
        console.log('Expected classic: read:confluence-content.all, read:confluence-space.summary');
        console.log('OR granular: read:page:confluence, read:space:confluence');
      }
    }
  } catch (error) {
    console.log('Could not decode token:', error.message);
  }

  console.log('\n=== Testing Complete ===\n');
  rl.close();
}

testConfluenceToken().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
