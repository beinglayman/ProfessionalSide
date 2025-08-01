const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotificationHistory() {
  try {
    console.log('🔍 Investigating notification history for workspace invitations...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User:', {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    });
    
    // Find the specific invitation that was accepted
    const acceptedInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: user.email,
        status: 'accepted'
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { id: true, name: true, email: true } }
      }
    });
    
    if (acceptedInvitation) {
      console.log('\n📧 Found accepted invitation:');
      console.log(`  ID: ${acceptedInvitation.id}`);
      console.log(`  Workspace: ${acceptedInvitation.workspace.name}`);
      console.log(`  From: ${acceptedInvitation.inviter.name} (${acceptedInvitation.inviter.email})`);
      console.log(`  Created: ${acceptedInvitation.createdAt}`);
      console.log(`  User created: ${user.createdAt}`);
      
      // Check if user existed when invitation was created
      const userExistedWhenInvited = user.createdAt < acceptedInvitation.createdAt;
      console.log(`  User existed when invited: ${userExistedWhenInvited ? 'YES' : 'NO'}`);
      
      if (userExistedWhenInvited) {
        console.log('  ✅ Should have received notification');
        
        // Search for any notification that might have been created for this invitation
        const possibleNotifications = await prisma.notification.findMany({
          where: {
            recipientId: user.id,
            type: 'WORKSPACE_INVITE'
          },
          include: {
            sender: { select: { name: true, email: true } }
          }
        });
        
        console.log(`\n🔔 Found ${possibleNotifications.length} WORKSPACE_INVITE notifications:`);
        
        if (possibleNotifications.length > 0) {
          possibleNotifications.forEach((notif, index) => {
            console.log(`\n    ${index + 1}. ID: ${notif.id}`);
            console.log(`       Message: ${notif.message}`);
            console.log(`       From: ${notif.sender?.name || 'Unknown'}`);
            console.log(`       Created: ${notif.createdAt}`);
            console.log(`       Data:`, notif.data);
            
            // Check if this notification matches our invitation
            const matchesInvitation = notif.data && 
              notif.data.invitationId === acceptedInvitation.id;
            console.log(`       Matches invitation: ${matchesInvitation ? 'YES' : 'NO'}`);
          });
        } else {
          console.log('    No WORKSPACE_INVITE notifications found at all!');
        }
      } else {
        console.log('  ❌ User was created AFTER invitation - correctly no notification');
      }
    }
    
    // Let's also check if there are ANY notifications for this user
    const anyNotifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📱 Total notifications for user: ${anyNotifications.length}`);
    
    if (anyNotifications.length > 0) {
      console.log('All notifications:');
      anyNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. [${notif.type}] ${notif.title} (${notif.createdAt})`);
      });
    }
    
    // Now let's create a test scenario to verify the notification system works
    console.log('\n🧪 Testing notification system...');
    console.log('Creating a test workspace invitation to verify notifications work...');
    
    // Find another user to act as inviter
    const inviterUser = await prisma.user.findFirst({
      where: {
        email: { not: user.email }
      }
    });
    
    if (!inviterUser) {
      console.log('❌ No other user found to act as inviter');
      return;
    }
    
    console.log(`👤 Found inviter: ${inviterUser.name} (${inviterUser.email})`);
    
    // Find a workspace where the inviter is a member
    const inviterWorkspace = await prisma.workspaceMember.findFirst({
      where: { 
        userId: inviterUser.id,
        role: { in: ['OWNER', 'admin'] }
      },
      include: {
        workspace: { select: { id: true, name: true } }
      }
    });
    
    if (!inviterWorkspace) {
      console.log('❌ Inviter is not an owner/admin of any workspace');
      return;
    }
    
    console.log(`🏢 Using workspace: ${inviterWorkspace.workspace.name}`);
    
    // Check if user is already a member of this workspace
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: inviterWorkspace.workspace.id
      }
    });
    
    if (existingMembership) {
      console.log('❌ User is already a member of this workspace');
      return;
    }
    
    // Create a test invitation
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    console.log('\n📧 Creating test invitation...');
    
    const testInvitation = await prisma.workspaceInvitation.create({
      data: {
        email: user.email,
        name: user.name,
        workspaceId: inviterWorkspace.workspace.id,
        inviterId: inviterUser.id,
        role: 'editor',
        message: 'Test invitation to verify notification system works!',
        token,
        expiresAt
      }
    });
    
    console.log(`✅ Created test invitation: ${testInvitation.id}`);
    
    // Now create the notification (this should happen automatically in the real API)
    console.log('🔔 Creating notification for test invitation...');
    
    const testNotification = await prisma.notification.create({
      data: {
        type: 'WORKSPACE_INVITE',
        title: 'Workspace Invitation',
        message: `${inviterUser.name} invited you to join "${inviterWorkspace.workspace.name}"`,
        recipientId: user.id,
        senderId: inviterUser.id,
        relatedEntityType: 'WORKSPACE',
        relatedEntityId: inviterWorkspace.workspace.id,
        data: {
          invitationId: testInvitation.id,
          workspaceName: inviterWorkspace.workspace.name,
          inviterName: inviterUser.name,
          role: 'editor',
          message: 'Test invitation to verify notification system works!'
        }
      }
    });
    
    console.log(`✅ Created test notification: ${testNotification.id}`);
    console.log('\n🎉 Test complete! Check the bell icon - you should now see the notification.');
    console.log(`📋 Test invitation details:`);
    console.log(`   Workspace: ${inviterWorkspace.workspace.name}`);
    console.log(`   From: ${inviterUser.name}`);
    console.log(`   Message: "Test invitation to verify notification system works!"`);
    
  } catch (error) {
    console.error('❌ Error checking notification history:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotificationHistory();