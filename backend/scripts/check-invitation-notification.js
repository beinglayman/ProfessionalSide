const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInvitationNotification() {
  try {
    console.log('🔍 Checking if workspace invitation created an in-app notification...');
    
    // First, let's find the current user (honey@incronicle.com)
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', {
      id: user.id,
      name: user.name,
      email: user.email
    });
    
    // Check for workspace invitation notifications
    const invitationNotifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        type: 'WORKSPACE_INVITE'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📧 Found ${invitationNotifications.length} workspace invitation notifications:`);
    
    if (invitationNotifications.length > 0) {
      invitationNotifications.forEach((notification, index) => {
        console.log(`\n  ${index + 1}. Notification ID: ${notification.id}`);
        console.log(`     Title: ${notification.title}`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     From: ${notification.sender.name} (${notification.sender.email})`);
        console.log(`     Created: ${notification.createdAt}`);
        console.log(`     Read: ${notification.isRead ? 'Yes' : 'No'}`);
        console.log(`     Data:`, notification.data);
        console.log(`     Related Entity: ${notification.relatedEntityType} - ${notification.relatedEntityId}`);
      });
      
      console.log('\n✅ Workspace invitation notifications exist! They should appear in the bell icon.');
      
    } else {
      console.log('\n❌ No workspace invitation notifications found.');
      console.log('This might mean:');
      console.log('1. The invitation was created before notification was implemented');
      console.log('2. The user account didn\'t exist when invitation was sent');
      console.log('3. There\'s an issue with the notification creation logic');
      
      // Let's check the invitation details
      const invitation = await prisma.workspaceInvitation.findFirst({
        where: {
          email: user.email,
          status: 'pending'
        },
        include: {
          workspace: { select: { name: true } },
          inviter: { select: { name: true, email: true } }
        }
      });
      
      if (invitation) {
        console.log('\n📋 Current invitation details:');
        console.log(`  Workspace: ${invitation.workspace.name}`);
        console.log(`  Invited by: ${invitation.inviter.name} (${invitation.inviter.email})`);
        console.log(`  Created: ${invitation.createdAt}`);
        console.log(`  Status: ${invitation.status}`);
        
        console.log('\n🔧 This invitation exists but has no notification.');
        console.log('The notification should have been created when the invitation was sent.');
      }
    }
    
    // Also check all notifications for this user to see the broader picture
    const allNotifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        sender: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`\n📱 Recent notifications for user (last 10):`);
    if (allNotifications.length > 0) {
      allNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. [${notification.type}] ${notification.title} - ${notification.isRead ? 'Read' : 'Unread'} (${notification.createdAt})`);
      });
    } else {
      console.log('  No notifications found for this user.');
    }
    
  } catch (error) {
    console.error('❌ Error checking invitation notification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvitationNotification();