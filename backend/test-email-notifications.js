#!/usr/bin/env node

/**
 * Test Email Notifications Script
 * 
 * This script tests the email notification system by:
 * 1. Testing email configuration
 * 2. Sending a test email
 * 3. Creating a test notification that triggers an email
 * 
 * Usage:
 * node test-email-notifications.js [your-email@domain.com]
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3002/api/v1';

// Test credentials - replace with real user tokens
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-test-token-here';

// Default test email
const DEFAULT_TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }

    console.log(`📡 ${method.toUpperCase()} ${endpoint}${data ? ' with data' : ''}`);
    const response = await axios(config);
    
    console.log(`✅ Success: ${response.status} ${response.statusText}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`❌ Network Error: ${error.message}`);
    }
    throw error;
  }
}

async function testEmailConfiguration() {
  console.log('\n🔧 Testing Email Configuration...');
  try {
    const result = await makeRequest('GET', '/email/test-config');
    console.log('📊 Email config status:', result);
    return result;
  } catch (error) {
    console.error('Email configuration test failed');
    return null;
  }
}

async function sendTestEmail(testEmail) {
  console.log(`\n📧 Sending Test Email to ${testEmail}...`);
  try {
    const result = await makeRequest('POST', '/email/test', {
      to: testEmail,
      subject: 'InChronicle Email Test',
      message: `
        <h2>🎉 Email Test Successful!</h2>
        <p>If you're reading this, your InChronicle email notifications are working correctly.</p>
        <p><strong>Test timestamp:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><em>This is an automated test email from your InChronicle application.</em></p>
      `
    });
    console.log('📨 Test email result:', result);
    return result;
  } catch (error) {
    console.error('Failed to send test email');
    return null;
  }
}

async function getUserId() {
  console.log('\n👤 Getting current user info...');
  try {
    const result = await makeRequest('GET', '/auth/me');
    console.log('🆔 Current user:', result.data?.name || 'Unknown');
    return result.data?.id;
  } catch (error) {
    console.error('Failed to get current user');
    return null;
  }
}

async function enableEmailNotifications(userId) {
  console.log('\n⚙️ Enabling email notifications for user...');
  try {
    const result = await makeRequest('PUT', '/notifications/preferences', {
      emailNotifications: true,
      likes: true,
      comments: true,
      mentions: true,
      workspaceInvites: true,
      achievements: true,
      systemUpdates: true
    });
    console.log('✅ Email notifications enabled');
    return result;
  } catch (error) {
    console.error('Failed to enable email notifications');
    return null;
  }
}

async function createTestNotification(userId) {
  console.log('\n🔔 Creating test notification to trigger email...');
  try {
    const result = await makeRequest('POST', '/notifications', {
      type: 'SYSTEM',
      title: 'Email Notification Test',
      message: 'This is a test notification to verify email notifications are working.',
      recipientId: userId,
      data: {
        testMessage: 'If you receive this email, your notifications are working correctly!',
        timestamp: new Date().toISOString()
      }
    });
    console.log('🎯 Test notification created:', result.data?.id);
    return result;
  } catch (error) {
    console.error('Failed to create test notification');
    return null;
  }
}

async function getQueueStats() {
  console.log('\n📊 Getting email queue statistics...');
  try {
    const result = await makeRequest('GET', '/email/queue/stats');
    console.log('📈 Queue stats:', result.data);
    return result;
  } catch (error) {
    console.error('Failed to get queue stats');
    return null;
  }
}

async function main() {
  const testEmail = process.argv[2] || DEFAULT_TEST_EMAIL;
  
  console.log('🚀 Starting Email Notification Test Suite');
  console.log(`📧 Test email: ${testEmail}`);
  console.log(`🌐 API URL: ${BASE_URL}`);
  console.log(`🔑 Auth token: ${TEST_AUTH_TOKEN ? 'Provided' : 'Missing - set TEST_AUTH_TOKEN env var'}`);
  
  if (!TEST_AUTH_TOKEN || TEST_AUTH_TOKEN === 'your-test-token-here') {
    console.error('\n❌ No auth token provided. Set TEST_AUTH_TOKEN environment variable.');
    console.log('\nExample:');
    console.log('TEST_AUTH_TOKEN="your-jwt-token" node test-email-notifications.js test@example.com');
    process.exit(1);
  }

  let passed = 0;
  let total = 0;

  // Test 1: Email Configuration
  total++;
  const configTest = await testEmailConfiguration();
  if (configTest) passed++;

  // Test 2: Get User ID
  total++;
  const userId = await getUserId();
  if (userId) passed++;

  // Test 3: Enable Email Notifications
  if (userId) {
    total++;
    const prefsTest = await enableEmailNotifications(userId);
    if (prefsTest) passed++;
  }

  // Test 4: Send Direct Test Email
  total++;
  const emailTest = await sendTestEmail(testEmail);
  if (emailTest) passed++;

  // Test 5: Create Notification (triggers email)
  if (userId) {
    total++;
    const notificationTest = await createTestNotification(userId);
    if (notificationTest) passed++;
  }

  // Test 6: Check Queue Stats
  total++;
  const queueTest = await getQueueStats();
  if (queueTest) passed++;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Email notifications should be working.');
    console.log(`✅ Check your email (${testEmail}) for test messages.`);
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
    console.log('\nCommon issues:');
    console.log('- EMAIL_ENABLED=false in environment variables');
    console.log('- SMTP configuration not set correctly');
    console.log('- User email notifications disabled in preferences');
    console.log('- Invalid authentication token');
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Check your email for test messages');
  console.log('2. Verify SMTP settings in Railway environment variables');
  console.log('3. Test actual user interactions (likes, comments, etc.)');
  console.log('4. Monitor Railway logs for email sending activity');
}

if (require.main === module) {
  main().catch(console.error);
}