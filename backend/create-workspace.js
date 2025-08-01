const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createWorkspace() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'sarah.chen@techcorp.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Q1 Product Updates',
        description: 'Product development updates for Q1',
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      }
    });
    
    console.log('Created workspace:', workspace.name);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating workspace:', error);
  }
}

createWorkspace();