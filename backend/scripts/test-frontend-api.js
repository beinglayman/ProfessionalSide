const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFrontendAPI() {
  try {
    console.log('🔍 Testing frontend API calls for notifications...');
    
    // First verify we have the notification in the database
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Testing for user:', user.email);
    
    // Check notifications directly from database
    const notifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        sender: { select: { name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📋 Found ${notifications.length} notifications in database:`);
    
    if (notifications.length > 0) {
      notifications.forEach((notif, index) => {
        console.log(`\n  ${index + 1}. ID: ${notif.id}`);
        console.log(`     Type: ${notif.type}`);
        console.log(`     Title: ${notif.title}`);
        console.log(`     Message: ${notif.message}`);
        console.log(`     From: ${notif.sender?.name || 'System'}`);
        console.log(`     Read: ${notif.isRead ? 'Yes' : 'No'}`);
        console.log(`     Created: ${notif.createdAt}`);
        if (notif.data) {
          console.log(`     Data:`, JSON.stringify(notif.data, null, 2));
        }
      });
    }
    
    // Check unread count
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: user.id,
        isRead: false
      }
    });
    
    console.log(`\n📊 Unread notifications count: ${unreadCount}`);
    
    // Test what the API endpoints would return
    console.log('\n🌐 Testing API response format...');
    
    // Format like the API would
    const apiResponse = {
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: notif.data,
        isRead: notif.isRead,
        recipientId: notif.recipientId,
        senderId: notif.senderId,
        relatedEntityType: notif.relatedEntityType,
        relatedEntityId: notif.relatedEntityId,
        createdAt: notif.createdAt.toISOString(),
        readAt: notif.readAt?.toISOString(),
        sender: notif.sender ? {
          id: notif.senderId,
          name: notif.sender.name,
          avatar: notif.sender.avatar
        } : null
      })),
      total: notifications.length,
      page: 1,
      totalPages: Math.ceil(notifications.length / 10)
    };
    
    console.log('📡 API Response would be:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Check notification preferences
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: user.id }
    });
    
    console.log('\n⚙️  Notification preferences:');
    if (preferences) {
      console.log(`  Workspace invites enabled: ${preferences.workspaceInvites}`);
      console.log(`  Email notifications: ${preferences.emailNotifications}`);
      console.log(`  Push notifications: ${preferences.pushNotifications}`);
    } else {
      console.log('  No preferences found (should use defaults)');
    }
    
    console.log('\n🎯 Summary:');
    console.log(`- Database has ${notifications.length} notifications`);
    console.log(`- ${unreadCount} are unread`);
    console.log(`- Notification preferences are ${preferences ? 'set' : 'not set (using defaults)'}`);
    console.log(`- API should return the notification data correctly`);
    
    if (notifications.length > 0 && unreadCount > 0) {
      console.log('\n✅ Everything looks correct on the backend side!');
      console.log('🔔 The bell icon should show:');
      console.log(`   - A notification badge with count: ${unreadCount}`);
      console.log(`   - When clicked, dropdown should show ${notifications.length} notification(s)`);
      console.log('   - The workspace invitation notification should be visible');
      
      // Let's also check the specific workspace invitation notification
      const workspaceInviteNotif = notifications.find(n => n.type === 'WORKSPACE_INVITE');
      if (workspaceInviteNotif) {
        console.log('\n📧 Workspace invitation notification details:');
        console.log(`   - Title: "${workspaceInviteNotif.title}"`);
        console.log(`   - Message: "${workspaceInviteNotif.message}"`);
        console.log(`   - From: ${workspaceInviteNotif.sender?.name || 'Unknown'}`);
        console.log(`   - Workspace: ${workspaceInviteNotif.data?.workspaceName || 'Unknown'}`);
        console.log(`   - Has invitation ID: ${workspaceInviteNotif.data?.invitationId ? 'Yes' : 'No'}`);
        
        if (workspaceInviteNotif.data?.invitationId) {
          // Check if the invitation still exists
          const invitation = await prisma.workspaceInvitation.findUnique({
            where: { id: workspaceInviteNotif.data.invitationId }
          });
          
          console.log(`   - Invitation exists: ${invitation ? 'Yes' : 'No'}`);
          if (invitation) {
            console.log(`   - Invitation status: ${invitation.status}`);
          }
        }
      }
    } else {
      console.log('\n❌ No notifications found - this explains why the bell icon is empty!');
    }
    
  } catch (error) {
    console.error('❌ Error testing frontend API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendAPI();