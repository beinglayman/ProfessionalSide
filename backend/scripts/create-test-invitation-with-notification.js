const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestInvitationWithNotification() {
  try {
    console.log('🧪 Creating test workspace invitation with notification...');
    
    // Find the user who will receive the invitation
    const recipientUser = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (!recipientUser) {
      console.log('❌ Recipient user not found');
      return;
    }
    
    // Find a different user who will send the invitation
    const inviterUser = await prisma.user.findFirst({
      where: {
        email: { not: 'honey@incronicle.com' }
      }
    });
    
    if (!inviterUser) {
      console.log('❌ No inviter user found');
      return;
    }
    
    // Find or create a test workspace
    let workspace = await prisma.workspace.findFirst({
      where: { 
        name: 'Test Notification Workspace',
        members: {
          some: { userId: inviterUser.id }
        }
      }
    });
    
    if (!workspace) {
      console.log('🏢 Creating test workspace...');
      
      // Get an organization (or create one)
      let organization = await prisma.organization.findFirst();
      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            name: 'Test Organization',
            description: 'Test organization for invitation notifications'
          }
        });
      }
      
      workspace = await prisma.workspace.create({
        data: {
          name: 'Test Notification Workspace',
          description: 'A test workspace to verify invitation notifications work properly.',
          organizationId: organization.id,
          members: {
            create: {
              userId: inviterUser.id,
              role: 'OWNER'
            }
          }
        }
      });
      
      console.log('✅ Created test workspace:', workspace.name);
    }
    
    console.log('📋 Test setup:');
    console.log(`  Inviter: ${inviterUser.name} (${inviterUser.email})`);
    console.log(`  Recipient: ${recipientUser.name} (${recipientUser.email})`);
    console.log(`  Workspace: ${workspace.name}`);
    
    // Check if invitation already exists
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: recipientUser.email,
        workspaceId: workspace.id,
        status: 'pending'
      }
    });
    
    if (existingInvitation) {
      console.log('⚠️ Invitation already exists, cleaning up first...');
      await prisma.workspaceInvitation.delete({
        where: { id: existingInvitation.id }
      });
    }
    
    // Create invitation
    console.log('\n📧 Creating workspace invitation...');
    
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        email: recipientUser.email,
        name: recipientUser.name,
        workspaceId: workspace.id,
        inviterId: inviterUser.id,
        role: 'editor',
        message: 'Test invitation to verify notifications work!',
        token,
        expiresAt
      }
    });
    
    console.log('✅ Created invitation:', invitation.id);
    
    // NOW CREATE THE NOTIFICATION (this is what should happen automatically)
    console.log('\n🔔 Creating in-app notification...');
    
    const notification = await prisma.notification.create({
      data: {
        type: 'WORKSPACE_INVITE',
        title: 'Workspace Invitation',
        message: `${inviterUser.name} invited you to join "${workspace.name}"`,
        recipientId: recipientUser.id,
        senderId: inviterUser.id,
        relatedEntityType: 'WORKSPACE',
        relatedEntityId: workspace.id,
        data: {
          invitationId: invitation.id,
          workspaceName: workspace.name,
          inviterName: inviterUser.name,
          role: invitation.role,
          message: invitation.message
        }
      }
    });
    
    console.log('✅ Created notification:', {
      id: notification.id,
      title: notification.title,
      message: notification.message
    });
    
    console.log('\n🎉 Test invitation with notification created successfully!');
    console.log('👀 Check the bell icon in the header - you should see the notification now!');
    
    // Verify the notification was created
    const verifyNotification = await prisma.notification.findUnique({
      where: { id: notification.id },
      include: {
        sender: { select: { name: true } }
      }
    });
    
    if (verifyNotification) {
      console.log('\n✅ Verification: Notification exists in database');
      console.log(`   From: ${verifyNotification.sender.name}`);
      console.log(`   To: ${recipientUser.name}`);
      console.log(`   Status: ${verifyNotification.isRead ? 'Read' : 'Unread'}`);
      console.log(`   Created: ${verifyNotification.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating test invitation with notification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInvitationWithNotification();