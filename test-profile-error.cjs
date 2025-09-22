#!/usr/bin/env node

const https = require('https');

const baseUrl = 'https://api.inchronicle.com/api/v1';

// Test user authentication endpoint first
function testAuth() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword'
    });
    
    const options = {
      hostname: 'api.inchronicle.com',
      port: 443,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('🔍 AUTH RESPONSE STATUS:', res.statusCode);
        console.log('🔍 AUTH RESPONSE HEADERS:', res.headers);
        console.log('🔍 AUTH RESPONSE BODY:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });
    
    req.on('error', (e) => {
      console.error('🔍 AUTH ERROR:', e.message);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test the skills endpoint that's causing the error
function testSkills(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.inchronicle.com',
      port: 443,
      path: '/api/v1/users/skills/my',
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
        console.log('🔍 SKILLS RESPONSE STATUS:', res.statusCode);
        console.log('🔍 SKILLS RESPONSE HEADERS:', res.headers);
        console.log('🔍 SKILLS RESPONSE BODY:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });
    
    req.on('error', (e) => {
      console.error('🔍 SKILLS ERROR:', e.message);
      reject(e);
    });
    
    req.end();
  });
}

async function main() {
  console.log('🚀 Testing profile error reproduction...');
  
  try {
    // First, test with invalid token to see error response
    console.log('\n1. Testing with invalid token...');
    await testSkills('invalid-token-for-testing');
    
    // Note: We can't easily test with valid token without user credentials
    // But this will help us see the error format and details
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();