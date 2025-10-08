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
    
    // Create user profile
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        profileCompleteness: 80,
        showEmail: false,
        showLocation: true,
        showCompany: true,
        experience: 'Full-stack development',
        education: 'Computer Science Graduate',
        certifications: 'Various certifications',
        languages: 'English'
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
