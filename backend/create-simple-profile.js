const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUserProfile() {
  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    // Create user profile with only valid fields
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        profileCompleteness: 80
      }
    });
    console.log('Created user profile for:', user.email);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('User profile already exists');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUserProfile();
