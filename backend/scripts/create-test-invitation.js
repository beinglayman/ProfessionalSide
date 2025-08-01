const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestInvitation() {
  try {
    console.log('🔍 Checking existing invitations for honey@inchronicle.com...');
    
    // Check existing invitations
    const existingInvitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: 'honey@inchronicle.com'
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });
    
    console.log(`Found ${existingInvitations.length} existing invitations:`);
    existingInvitations.forEach(inv => {
      console.log(`- ${inv.workspace.name} (${inv.status}) invited by ${inv.inviter.name}`);
    });
    
    // Check if there are any pending invitations
    const pendingInvitations = existingInvitations.filter(inv => 
      inv.status === 'pending' && inv.expiresAt > new Date()
    );
    
    if (pendingInvitations.length > 0) {
      console.log(`✅ Found ${pendingInvitations.length} pending invitation(s). Widget should show!`);
      return;
    }
    
    console.log('📝 No pending invitations found. Creating test invitation...');
    
    // Find or create a test workspace
    let workspace = await prisma.workspace.findFirst({
      where: { name: 'Support Team Workspace' }
    });
    
    if (!workspace) {
      console.log('🏢 Creating Support Team Workspace...');
      
      // Find or create TechCorp organization
      let organization = await prisma.organization.findFirst({
        where: { name: 'TechCorp' }
      });
      
      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            name: 'TechCorp',
            description: 'Technology Corporation'
          }
        });
      }
      
      // Find a user to be the workspace owner (not honey)
      const ownerUser = await prisma.user.findFirst({
        where: {
          email: { not: 'honey@inchronicle.com' }
        }
      });
      
      if (!ownerUser) {
        console.log('👤 Creating test owner user...');
        const testOwner = await prisma.user.create({
          data: {
            email: 'manager@inchronicle.com',
            name: 'Sarah Manager',
            password: '$2b$10$example', // This won't be used for login
            title: 'Team Lead',
            company: 'TechCorp'
          }
        });
        
        workspace = await prisma.workspace.create({
          data: {
            name: 'Support Team Workspace',
            description: 'Collaborative workspace for customer support team operations and knowledge sharing.',
            organizationId: organization.id,
            members: {
              create: {
                userId: testOwner.id,
                role: 'OWNER'
              }
            }
          }
        });
        
        // Create the invitation
        const invitation = await prisma.workspaceInvitation.create({
          data: {
            email: 'honey@inchronicle.com',
            name: 'Honey Arora',
            workspaceId: workspace.id,
            inviterId: testOwner.id,
            role: 'editor',
            message: 'Welcome to our support team! We\'d love to have you collaborate with us.',
            token: require('crypto').randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          }
        });
        
        console.log('✅ Created test invitation:', {
          id: invitation.id,
          workspace: workspace.name,
          inviter: testOwner.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        });
        
      } else {
        console.log('👤 Using existing user as workspace owner:', ownerUser.name);
        
        workspace = await prisma.workspace.create({
          data: {
            name: 'Support Team Workspace',
            description: 'Collaborative workspace for customer support team operations and knowledge sharing.',
            organizationId: organization.id,
            members: {
              create: {
                userId: ownerUser.id,
                role: 'OWNER'
              }
            }
          }
        });
        
        // Create the invitation
        const invitation = await prisma.workspaceInvitation.create({
          data: {
            email: 'honey@inchronicle.com',
            name: 'Honey Arora',
            workspaceId: workspace.id,
            inviterId: ownerUser.id,
            role: 'editor',
            message: 'Welcome to our support team! We\'d love to have you collaborate with us.',
            token: require('crypto').randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          }
        });
        
        console.log('✅ Created test invitation:', {
          id: invitation.id,
          workspace: workspace.name,
          inviter: ownerUser.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        });
      }
    } else {
      console.log('🏢 Using existing workspace:', workspace.name);
      
      // Find workspace owner
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: workspace.id,
          role: { in: ['OWNER', 'owner'] }
        },
        include: { user: true }
      });
      
      if (workspaceMember) {
        // Create the invitation
        const invitation = await prisma.workspaceInvitation.create({
          data: {
            email: 'honey@inchronicle.com',
            name: 'Honey Arora',
            workspaceId: workspace.id,
            inviterId: workspaceMember.userId,
            role: 'editor',
            message: 'Welcome to our support team! We\'d love to have you collaborate with us.',
            token: require('crypto').randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          }
        });
        
        console.log('✅ Created test invitation:', {
          id: invitation.id,
          workspace: workspace.name,
          inviter: workspaceMember.user.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        });
      }
    }
    
    console.log('🎉 Test invitation created! The widget should now appear on the workspace discovery page.');
    
  } catch (error) {
    console.error('❌ Error creating test invitation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInvitation();