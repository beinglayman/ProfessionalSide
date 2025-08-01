const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInvitationTiming() {
  try {
    console.log('🔍 Checking invitation vs user account timing...');
    
    // Get user creation time
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    
    // Get invitation creation time
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: 'honey@incronicle.com',
        status: 'pending'
      },
      select: {
        id: true,
        createdAt: true,
        workspaceId: true
      }
    });
    
    if (user && invitation) {
      console.log('👤 User account created:', user.createdAt);
      console.log('📧 Invitation created:', invitation.createdAt);
      
      const userFirst = user.createdAt < invitation.createdAt;
      const timeDiff = Math.abs(invitation.createdAt - user.createdAt) / 1000; // seconds
      
      console.log(`\n📊 Analysis:`);
      console.log(`  User created ${userFirst ? 'BEFORE' : 'AFTER'} invitation`);
      console.log(`  Time difference: ${timeDiff.toFixed(0)} seconds`);
      
      if (userFirst) {
        console.log(`\n✅ User existed when invitation was sent - notification SHOULD have been created`);
        console.log(`❌ But no notification exists - there's likely a bug in the notification logic`);
        
        console.log(`\n🔧 Let's create the missing notification manually...`);
        
        // Get invitation details
        const fullInvitation = await prisma.workspaceInvitation.findFirst({
          where: { id: invitation.id },
          include: {
            workspace: { select: { name: true } },
            inviter: { select: { id: true, name: true } }
          }
        });
        
        // Create the missing notification
        const notification = await prisma.notification.create({
          data: {
            type: 'WORKSPACE_INVITE',
            title: 'Workspace Invitation',
            message: `${fullInvitation.inviter.name} invited you to join "${fullInvitation.workspace.name}"`,
            recipientId: user.id,
            senderId: fullInvitation.inviter.id,
            relatedEntityType: 'WORKSPACE',
            relatedEntityId: fullInvitation.workspaceId,
            data: {
              invitationId: fullInvitation.id,
              workspaceName: fullInvitation.workspace.name,
              inviterName: fullInvitation.inviter.name,
              role: fullInvitation.role,
              message: fullInvitation.message || ''
            }
          }
        });
        
        console.log(`✅ Created missing notification:`, {
          id: notification.id,
          title: notification.title,
          message: notification.message
        });
        
      } else {
        console.log(`\n❌ User was created AFTER invitation - notification correctly not created`);
        console.log(`   (Notifications are only for existing users)`);
      }
      
    } else {
      if (!user) console.log('❌ User not found');
      if (!invitation) console.log('❌ Invitation not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking invitation timing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvitationTiming();