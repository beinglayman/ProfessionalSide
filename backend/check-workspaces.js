const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWorkspaces() {
  try {
    // Check organizations
    const orgs = await prisma.organization.findMany();
    console.log('Organizations:', orgs.length);
    orgs.forEach(org => console.log(`- ${org.name} (${org.id})`));
    
    // Check workspaces
    const workspaces = await prisma.workspace.findMany({
      include: {
        organization: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });
    console.log('\nWorkspaces:', workspaces.length);
    workspaces.forEach(ws => {
      console.log(`- ${ws.name} (${ws.id})`);
      console.log(`  Org: ${ws.organization?.name || 'None'}`);
      console.log(`  Members: ${ws.members.length}`);
      ws.members.forEach(member => {
        console.log(`    - ${member.user.name} (${member.role})`);
      });
    });
    
    // Check users
    const users = await prisma.user.findMany();
    console.log('\nUsers:', users.length);
    users.forEach(user => console.log(`- ${user.name} (${user.email})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkspaces();