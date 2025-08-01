const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixInviterName() {
  try {
    console.log('🔍 Checking inviter name issue...');
    
    // Find the invitation and its inviter
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: 'honey@incronicle.com',
        status: 'pending'
      },
      include: {
        inviter: true,
        workspace: { select: { name: true } }
      }
    });
    
    if (invitation) {
      console.log('📧 Found invitation:', {
        workspace: invitation.workspace.name,
        inviterName: invitation.inviter.name,
        inviterEmail: invitation.inviter.email,
        inviterId: invitation.inviter.id
      });
      
      if (invitation.inviter.name === 'User') {
        console.log('🔧 Updating inviter name from "User" to a proper name...');
        
        // Update the inviter's name to something more realistic
        const updatedUser = await prisma.user.update({
          where: { id: invitation.inviter.id },
          data: {
            name: 'Sarah Johnson',
            title: 'Team Lead'
          }
        });
        
        console.log('✅ Updated inviter:', {
          name: updatedUser.name,
          title: updatedUser.title,
          email: updatedUser.email
        });
        
        // Verify the change
        const verifyInvitation = await prisma.workspaceInvitation.findFirst({
          where: { id: invitation.id },
          include: {
            inviter: { select: { name: true, title: true } }
          }
        });
        
        console.log('🎉 Invitation now shows inviter as:', verifyInvitation.inviter.name);
        
      } else {
        console.log('✅ Inviter already has a proper name:', invitation.inviter.name);
      }
      
    } else {
      console.log('❌ No pending invitation found for honey@incronicle.com');
    }
    
  } catch (error) {
    console.error('❌ Error fixing inviter name:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInviterName();