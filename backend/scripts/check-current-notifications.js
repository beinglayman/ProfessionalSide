const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentNotifications() {
  try {
    console.log('🔍 Checking current notifications and invitations...');
    
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
    
    // Check ALL notifications for this user
    const allNotifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        sender: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n🔔 Found ${allNotifications.length} total notifications:`);
    
    if (allNotifications.length > 0) {
      allNotifications.forEach((notification, index) => {
        console.log(`\n  ${index + 1}. ID: ${notification.id}`);
        console.log(`     Type: ${notification.type}`);
        console.log(`     Title: ${notification.title}`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     From: ${notification.sender?.name || 'System'}`);
        console.log(`     Created: ${notification.createdAt}`);
        console.log(`     Read: ${notification.isRead ? 'Yes' : 'No'}`);
        console.log(`     Data:`, notification.data);
      });
    } else {
      console.log('  No notifications found.');
    }
    
    // Check current workspace invitations
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: user.email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📧 Found ${invitations.length} pending invitations:`);
    
    if (invitations.length > 0) {
      invitations.forEach((invitation, index) => {
        console.log(`\n  ${index + 1}. ID: ${invitation.id}`);
        console.log(`     Workspace: ${invitation.workspace.name}`);
        console.log(`     From: ${invitation.inviter.name} (${invitation.inviter.email})`);
        console.log(`     Created: ${invitation.createdAt}`);
        console.log(`     Expires: ${invitation.expiresAt}`);
        console.log(`     Message: ${invitation.message || 'No message'}`);
        
        // Check if this invitation has a corresponding notification
        const correspondingNotification = allNotifications.find(notif => 
          notif.type === 'WORKSPACE_INVITE' && 
          notif.data && 
          notif.data.invitationId === invitation.id
        );
        
        if (correspondingNotification) {
          console.log(`     ✅ Has notification: ${correspondingNotification.id}`);
        } else {
          console.log(`     ❌ Missing notification!`);
        }
      });
      
      // Count invitations without notifications
      const invitationsWithoutNotifications = invitations.filter(invitation => {
        return !allNotifications.some(notif => 
          notif.type === 'WORKSPACE_INVITE' && 
          notif.data && 
          notif.data.invitationId === invitation.id
        );
      });
      
      if (invitationsWithoutNotifications.length > 0) {
        console.log(`\n⚠️  Found ${invitationsWithoutNotifications.length} invitations without notifications!`);
        console.log('This means the notification system is not working properly.');
      }
      
    } else {
      console.log('  No pending invitations found.');
    }
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentNotifications();