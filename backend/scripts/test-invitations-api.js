const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInvitationsAPI() {
  try {
    console.log('🔍 Testing invitations API logic...');
    
    // Simulate the API logic
    const email = 'honey@inchronicle.com';
    
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${invitations.length} pending invitations for ${email}`);
    
    // Transform to match frontend interface
    const transformedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      organizationName: invitation.workspace.organization?.name || null,
      description: invitation.workspace.description || '',
      role: invitation.role,
      invitedBy: {
        id: invitation.inviter.id,
        name: invitation.inviter.name,
        avatar: invitation.inviter.avatar || '',
        position: invitation.inviter.title || ''
      },
      invitationDate: invitation.createdAt.toISOString(),
      expirationDate: invitation.expiresAt.toISOString(),
      status: invitation.status,
      isPersonal: !invitation.workspace.organization,
      message: invitation.message
    }));
    
    console.log('📄 Transformed invitations:');
    console.log(JSON.stringify(transformedInvitations, null, 2));
    
    if (transformedInvitations.length > 0) {
      console.log('✅ API should return invitations - widget should show!');
    } else {
      console.log('❌ No invitations returned - widget will be hidden');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInvitationsAPI();