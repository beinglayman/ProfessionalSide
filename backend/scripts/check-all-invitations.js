const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllInvitations() {
  try {
    console.log('🔍 Checking ALL invitations (any status) for honey@incronicle.com...');
    
    // Find ALL invitations for this email
    const allInvitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: 'honey@incronicle.com'
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📧 Found ${allInvitations.length} total invitations:`);
    
    if (allInvitations.length > 0) {
      allInvitations.forEach((invitation, index) => {
        console.log(`\n  ${index + 1}. ID: ${invitation.id}`);
        console.log(`     Workspace: ${invitation.workspace.name}`);
        console.log(`     From: ${invitation.inviter.name} (${invitation.inviter.email})`);
        console.log(`     Status: ${invitation.status}`);
        console.log(`     Created: ${invitation.createdAt}`);
        console.log(`     Expires: ${invitation.expiresAt}`);
        console.log(`     Expired: ${invitation.expiresAt < new Date() ? 'Yes' : 'No'}`);
        console.log(`     Message: ${invitation.message || 'No message'}`);
      });
    } else {
      console.log('  No invitations found at all.');
    }
    
    // Check if user is already a member of any workspaces
    const user = await prisma.user.findUnique({
      where: { email: 'honey@incronicle.com' }
    });
    
    if (user) {
      const workspaceMemberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
          workspace: { select: { name: true } }
        }
      });
      
      console.log(`\n👥 User is member of ${workspaceMemberships.length} workspaces:`);
      
      if (workspaceMemberships.length > 0) {
        workspaceMemberships.forEach((membership, index) => {
          console.log(`  ${index + 1}. ${membership.workspace.name} (Role: ${membership.role})`);
        });
      }
    }
    
    // Let's also check the workspace invitation route to see if it creates notifications
    console.log('\n🔧 Let me check the workspace invitation route logic...');
    
  } catch (error) {
    console.error('❌ Error checking invitations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllInvitations();