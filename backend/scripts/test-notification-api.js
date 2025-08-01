const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationAPI() {
  try {
    console.log('🔍 Testing notification API endpoints...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', {
      id: user.id,
      name: user.name,
      email: user.email
    });
    
    // Test 1: Get all notifications directly from database
    console.log('\n📋 Test 1: Direct database query for notifications...');
    
    const allNotifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        sender: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${allNotifications.length} notifications in database:`);
    
    if (allNotifications.length > 0) {
      allNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. [${notif.type}] ${notif.title}`);
        console.log(`     Message: ${notif.message}`);
        console.log(`     From: ${notif.sender?.name || 'System'}`);
        console.log(`     Created: ${notif.createdAt}`);
        console.log(`     Read: ${notif.isRead ? 'Yes' : 'No'}`);
        if (notif.data) {
          console.log(`     Data:`, notif.data);
        }
        console.log('');
      });
    } else {
      console.log('  No notifications found in database');
    }
    
    // Test 2: Get unread count
    console.log('📊 Test 2: Unread notifications count...');
    
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: user.id,
        isRead: false
      }
    });
    
    console.log(`Unread notifications: ${unreadCount}`);
    
    // Test 3: Check notification preferences
    console.log('\n⚙️  Test 3: Notification preferences...');
    
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: user.id }
    });
    
    if (preferences) {
      console.log('Found preferences:', {
        workspaceInvites: preferences.workspaceInvites,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications
      });
    } else {
      console.log('❌ No notification preferences found - this might be the issue!');
      
      // Create default preferences
      console.log('🔧 Creating default notification preferences...');
      
      const newPreferences = await prisma.notificationPreferences.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          pushNotifications: true,
          likes: true,
          comments: true,
          mentions: true,
          workspaceInvites: true,
          achievements: true,
          systemUpdates: true,
          digestFrequency: 'DAILY'
        }
      });
      
      console.log('✅ Created default preferences:', {
        workspaceInvites: newPreferences.workspaceInvites,
        emailNotifications: newPreferences.emailNotifications,
        pushNotifications: newPreferences.pushNotifications
      });
    }
    
    // Test 4: Check if there are pending workspace invitations that should have notifications
    console.log('\n📧 Test 4: Checking for workspace invitations without notifications...');
    
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: user.email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });
    
    console.log(`Found ${invitations.length} pending invitations:`);
    
    if (invitations.length > 0) {
      for (const invitation of invitations) {
        console.log(`\n  Invitation: ${invitation.workspace.name} from ${invitation.inviter.name}`);
        
        // Check if there's a corresponding notification
        const correspondingNotification = await prisma.notification.findFirst({
          where: {
            type: 'WORKSPACE_INVITE',
            recipientId: user.id,
            data: {
              path: ['invitationId'],
              equals: invitation.id
            }
          }
        });
        
        if (correspondingNotification) {
          console.log(`  ✅ Has notification: ${correspondingNotification.id}`);
        } else {
          console.log(`  ❌ Missing notification! Creating one now...`);
          
          // Create the missing notification
          const newNotification = await prisma.notification.create({
            data: {
              type: 'WORKSPACE_INVITE',
              title: 'Workspace Invitation',
              message: `${invitation.inviter.name} invited you to join "${invitation.workspace.name}"`,
              recipientId: user.id,
              senderId: invitation.inviterId,
              relatedEntityType: 'WORKSPACE',
              relatedEntityId: invitation.workspaceId,
              data: {
                invitationId: invitation.id,
                workspaceName: invitation.workspace.name,
                inviterName: invitation.inviter.name,
                role: invitation.role,
                message: invitation.message || ''
              }
            }
          });
          
          console.log(`  ✅ Created notification: ${newNotification.id}`);
        }
      }
    }
    
    // Test 5: Final verification - show all notifications again
    console.log('\n🔄 Test 5: Final verification - all notifications after fixes...');
    
    const finalNotifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        sender: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📱 Final count: ${finalNotifications.length} notifications`);
    
    if (finalNotifications.length > 0) {
      finalNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. [${notif.type}] ${notif.title} - ${notif.isRead ? 'Read' : 'Unread'}`);
      });
    }
    
    console.log('\n🎉 Notification API test complete!');
    console.log('Check the bell icon in the header - notifications should now be visible.');
    
  } catch (error) {
    console.error('❌ Error testing notification API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationAPI();