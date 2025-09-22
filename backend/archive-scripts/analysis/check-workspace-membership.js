const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkspaceMembership() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'sarah.chen@techcorp.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User ID:', user.id);
    
    // Check workspaces
    const workspaces = await prisma.workspace.findMany({
      include: {
        members: {
          where: { userId: user.id }
        }
      }
    });
    
    console.log('Workspaces:', workspaces.length);
    workspaces.forEach(ws => {
      console.log('- Workspace:', ws.name, '| ID:', ws.id, '| Members:', ws.members.length);
    });
    
    // Check workspace memberships
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true }
    });
    
    console.log('Memberships:', memberships.length);
    memberships.forEach(m => {
      console.log('- Member of:', m.workspace.name, '| Active:', m.isActive, '| Role:', m.role);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkWorkspaceMembership();