const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        avatar: null,
        title: 'Test Engineer',
        company: 'Test Company'
      }
    });
    console.log('Created test user:', user.email);
    
    // Add user to existing workspace
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: 'cmcyi6mbt0000t43s03fdrjz0',
        role: 'MEMBER'
      }
    });
    console.log('Added to workspace');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('User already exists');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
