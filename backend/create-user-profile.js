const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUserProfile() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'sarah.chen@techcorp.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Create profile for the user
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        profileCompleteness: 40,
        showEmail: false,
        showLocation: true,
        showCompany: true
      }
    });
    
    console.log('Created profile for user:', user.email);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating profile:', error);
  }
}

createUserProfile();