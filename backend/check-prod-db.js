const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking production database...');
    
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    
    const workspaceCount = await prisma.workspace.count();
    console.log(`Total workspaces: ${workspaceCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { email: true },
        take: 5
      });
      console.log('Sample users:', users.map(u => u.email));
    }
    
    if (workspaceCount > 0) {
      const workspaces = await prisma.workspace.findMany({
        select: { name: true, isPersonal: true, allowTeamMembers: true },
        take: 3
      });
      console.log('Sample workspaces:', workspaces);
    }
    
  } catch (error) {
    console.error('Database check error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();