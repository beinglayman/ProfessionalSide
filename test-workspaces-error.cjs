#!/usr/bin/env node

const https = require('https');

// Test the workspaces endpoint that's causing the 500 error
function testWorkspaces(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'professionalside-production.up.railway.app',
      port: 443,
      path: '/api/v1/workspaces',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('🔍 WORKSPACES RESPONSE STATUS:', res.statusCode);
        console.log('🔍 WORKSPACES RESPONSE HEADERS:', res.headers);
        console.log('🔍 WORKSPACES RESPONSE BODY:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });
    
    req.on('error', (e) => {
      console.error('🔍 WORKSPACES ERROR:', e.message);
      reject(e);
    });
    
    req.end();
  });
}

async function main() {
  console.log('🚀 Testing workspaces error reproduction...');
  
  try {
    // Test with invalid token to see error response format
    console.log('\n1. Testing with invalid token...');
    await testWorkspaces('invalid-token-for-testing');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();