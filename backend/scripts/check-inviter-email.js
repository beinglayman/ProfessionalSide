const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInviterEmail() {
  try {
    console.log('🔍 Checking inviter email for honey@incronicle.com invitation...');
    
    // Find the invitation and get full inviter details
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: 'honey@incronicle.com',
        status: 'pending'
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            title: true,
            company: true,
            createdAt: true
          }
        },
        workspace: {
          select: {
            name: true,
            description: true
          }
        }
      }
    });
    
    if (invitation) {
      console.log('📧 Invitation Details:');
      console.log('  Workspace:', invitation.workspace.name);
      console.log('  Description:', invitation.workspace.description);
      console.log('  Invited Email:', invitation.email);
      console.log('  Role:', invitation.role);
      console.log('  Status:', invitation.status);
      console.log('  Created:', invitation.createdAt);
      console.log('  Expires:', invitation.expiresAt);
      
      console.log('\n👤 Inviter Details:');
      console.log('  ID:', invitation.inviter.id);
      console.log('  Name:', invitation.inviter.name);
      console.log('  Email:', invitation.inviter.email);
      console.log('  Title:', invitation.inviter.title);
      console.log('  Company:', invitation.inviter.company);
      console.log('  Account Created:', invitation.inviter.createdAt);
      
    } else {
      console.log('❌ No pending invitation found for honey@incronicle.com');
      
      // Check if there are any invitations at all for this email
      const allInvitations = await prisma.workspaceInvitation.findMany({
        where: {
          email: 'honey@incronicle.com'
        },
        include: {
          inviter: { select: { name: true, email: true } },
          workspace: { select: { name: true } }
        }
      });
      
      if (allInvitations.length > 0) {
        console.log(`\n📋 Found ${allInvitations.length} total invitations (any status):`);
        allInvitations.forEach((inv, index) => {
          console.log(`  ${index + 1}. ${inv.workspace.name} - ${inv.status} (invited by: ${inv.inviter.name} <${inv.inviter.email}>)`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking inviter email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInviterEmail();