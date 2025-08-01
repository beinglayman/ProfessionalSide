const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function revertInviterName() {
  try {
    console.log('🔍 Reverting inviter name back to original...');
    
    // Find the user we modified
    const user = await prisma.user.findFirst({
      where: {
        email: 'x18honey@iima.ac.in'
      }
    });
    
    if (user) {
      console.log('👤 Found user:', {
        name: user.name,
        title: user.title,
        email: user.email
      });
      
      // Revert back to original name
      const revertedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'User',
          title: null
        }
      });
      
      console.log('✅ Reverted user back to original:', {
        name: revertedUser.name,
        title: revertedUser.title,
        email: revertedUser.email
      });
      
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error reverting inviter name:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertInviterName();