const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugInvitationNotification() {
  try {
    console.log('🔍 Debugging invitation notification issue...');
    
    // Find the user we're interested in
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
      email: user.email,
      createdAt: user.createdAt
    });
    
    // Find ALL invitations for this email (any status)
    const allInvitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: user.email
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            createdAt: true
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📧 Found ${allInvitations.length} invitations for ${user.email}:`);
    
    if (allInvitations.length === 0) {
      console.log('❌ No invitations found at all!');
      return;
    }
    
    allInvitations.forEach((invitation, index) => {
      console.log(`\n  ${index + 1}. Invitation Details:`);
      console.log(`     ID: ${invitation.id}`);
      console.log(`     Workspace: ${invitation.workspace.name}`);
      console.log(`     Status: ${invitation.status}`);
      console.log(`     Role: ${invitation.role}`);
      console.log(`     Created: ${invitation.createdAt}`);
      console.log(`     Expires: ${invitation.expiresAt}`);
      console.log(`     Inviter: ${invitation.inviter.name} (${invitation.inviter.email})`);
      console.log(`     Inviter Created: ${invitation.inviter.createdAt}`);
      
      // Check timing
      const userExistedWhenInvited = user.createdAt < invitation.createdAt;
      const inviterExistedWhenInvited = invitation.inviter.createdAt < invitation.createdAt;
      
      console.log(`     User existed when invited: ${userExistedWhenInvited ? 'YES' : 'NO'}`);
      console.log(`     Inviter existed when invited: ${inviterExistedWhenInvited ? 'YES' : 'NO'}`);
      
      if (userExistedWhenInvited) {
        console.log(`     ⚠️  Should have notification but checking...`);
      } else {
        console.log(`     ✅ Correctly no notification (user didn't exist)`);
      }
    });
    
    // Now check what notifications exist for this user
    console.log(`\n🔔 Checking notifications for user ${user.email}:`);
    
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id
      },
      include: {
        sender: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${notifications.length} notifications:`);
    
    if (notifications.length > 0) {
      notifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. [${notification.type}] ${notification.title}`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     From: ${notification.sender?.name || 'System'}`);
        console.log(`     Created: ${notification.createdAt}`);
        console.log(`     Read: ${notification.isRead}`);
        if (notification.data) {
          console.log(`     Data:`, notification.data);
        }
      });
    } else {
      console.log('  No notifications found.');
    }
    
    // If we have pending invitations but no notifications, create them
    const pendingInvitations = allInvitations.filter(inv => 
      inv.status === 'pending' && 
      user.createdAt < inv.createdAt &&
      inv.expiresAt > new Date()
    );
    
    if (pendingInvitations.length > 0) {
      console.log(`\n🔧 Found ${pendingInvitations.length} pending invitations that should have notifications but don't.`);
      console.log('Creating missing notifications...');
      
      for (const invitation of pendingInvitations) {
        try {
          const notification = await prisma.notification.create({
            data: {
              type: 'WORKSPACE_INVITE',
              title: 'Workspace Invitation',
              message: `${invitation.inviter.name} invited you to join "${invitation.workspace.name}"`,
              recipientId: user.id,
              senderId: invitation.inviter.id,
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
          
          console.log(`  ✅ Created notification ${notification.id} for invitation to ${invitation.workspace.name}`);
        } catch (error) {
          console.log(`  ❌ Failed to create notification for invitation ${invitation.id}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging invitation notification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugInvitationNotification();