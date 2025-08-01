const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEmailMismatch() {
  try {
    console.log('🔍 Checking email mismatch...');
    
    // Check what email the user is actually using
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'honey@inchronicle.com' },
          { email: 'honey@incronicle.com' }
        ]
      }
    });
    
    if (user) {
      console.log('👤 Found user with email:', user.email);
      
      // Check existing invitations
      const existingInvitations = await prisma.workspaceInvitation.findMany({
        where: {
          OR: [
            { email: 'honey@inchronicle.com' },
            { email: 'honey@incronicle.com' }
          ]
        }
      });
      
      console.log(`📧 Found ${existingInvitations.length} invitations:`);
      existingInvitations.forEach(inv => {
        console.log(`- Email: ${inv.email}, Status: ${inv.status}, Workspace: ${inv.workspaceId}`);
      });
      
      // Update invitations to match the user's actual email
      if (existingInvitations.length > 0) {
        const updateResult = await prisma.workspaceInvitation.updateMany({
          where: {
            OR: [
              { email: 'honey@inchronicle.com' },
              { email: 'honey@incronicle.com' }
            ],
            status: 'pending'
          },
          data: {
            email: user.email
          }
        });
        
        console.log(`✅ Updated ${updateResult.count} invitations to use email: ${user.email}`);
      }
      
      // Verify the fix
      const updatedInvitations = await prisma.workspaceInvitation.findMany({
        where: {
          email: user.email,
          status: 'pending'
        },
        include: {
          workspace: { select: { name: true } }
        }
      });
      
      console.log(`🎉 Found ${updatedInvitations.length} pending invitations for ${user.email}`);
      updatedInvitations.forEach(inv => {
        console.log(`- ${inv.workspace.name} (expires: ${inv.expiresAt})`);
      });
      
    } else {
      console.log('❌ No user found with either email variant');
    }
    
  } catch (error) {
    console.error('❌ Error fixing email mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmailMismatch();