const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testAPIWithAuth() {
  try {
    console.log('🔍 Testing API calls with proper authentication...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', user.email);
    
    // Generate a valid JWT token for this user (simulating login)
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'access'
      },
      JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'inchronicle-api',
        audience: 'inchronicle-app'
      }
    );
    
    console.log('🔑 Generated test token for user');
    
    // Test the notifications API endpoint
    const fetch = require('node-fetch');
    const API_BASE_URL = 'http://localhost:3002/api/v1';
    
    console.log('\n📋 Testing /notifications endpoint...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log('Response data:', JSON.stringify(result, null, 2));
      
      if (response.ok && result.success) {
        console.log('✅ Notifications API is working correctly!');
        console.log(`Found ${result.data.notifications.length} notifications`);
        
        if (result.data.notifications.length > 0) {
          console.log('📧 First notification:');
          const firstNotif = result.data.notifications[0];
          console.log(`   - Title: ${firstNotif.title}`);
          console.log(`   - Type: ${firstNotif.type}`);
          console.log(`   - Read: ${firstNotif.isRead ? 'Yes' : 'No'}`);
        }
      } else {
        console.log('❌ Notifications API returned an error');
      }
      
    } catch (fetchError) {
      console.log('❌ Failed to fetch notifications:', fetchError.message);
    }
    
    console.log('\n📊 Testing /notifications/unread-count endpoint...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log('Response data:', JSON.stringify(result, null, 2));
      
      if (response.ok && result.success) {
        console.log('✅ Unread count API is working correctly!');
        console.log(`Unread count: ${result.data.count}`);
      } else {
        console.log('❌ Unread count API returned an error');
      }
      
    } catch (fetchError) {
      console.log('❌ Failed to fetch unread count:', fetchError.message);
    }
    
    console.log('\n🎯 Summary:');
    console.log('If both API calls worked, then the issue is likely:');
    console.log('1. Frontend doesn\'t have a valid auth token in localStorage');
    console.log('2. Frontend is calling the wrong API URL');
    console.log('3. CORS issues between frontend and backend');
    
    console.log('\n🔧 To fix the notification display issue:');
    console.log('1. Check browser DevTools console for errors');
    console.log('2. Check Network tab to see if API calls are being made');
    console.log('3. Verify localStorage has "inchronicle_access_token"');
    console.log('4. Check if frontend is running on expected port (5173)');
    
    console.log('\n📝 Test token for debugging (expires in 1 hour):');
    console.log(`Bearer ${token}`);
    console.log('\nYou can use this token to test API calls manually in browser DevTools or Postman');
    
  } catch (error) {
    console.error('❌ Error testing API with auth:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIWithAuth();