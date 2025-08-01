const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fetchUserEmails() {
  try {
    console.log('Fetching all registered user email addresses...\n');
    
    // Fetch all users with only email, name, and basic info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total registered users: ${users.length}\n`);
    
    // Display all user emails
    console.log('User Email Addresses:');
    console.log('='.repeat(50));
    
    users.forEach((user, index) => {
      const status = user.isActive ? 'Active' : 'Inactive';
      const createdDate = user.createdAt.toISOString().split('T')[0];
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${createdDate}`);
      console.log('');
    });
    
    // Summary by status
    const activeUsers = users.filter(user => user.isActive);
    const inactiveUsers = users.filter(user => !user.isActive);
    
    console.log('Summary:');
    console.log('='.repeat(20));
    console.log(`Active users: ${activeUsers.length}`);
    console.log(`Inactive users: ${inactiveUsers.length}`);
    console.log(`Total users: ${users.length}`);
    
    // Export email list for convenience
    const emailList = users.map(user => user.email);
    console.log('\nEmail list (comma-separated):');
    console.log('='.repeat(50));
    console.log(emailList.join(', '));
    
  } catch (error) {
    console.error('Error fetching user emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fetchUserEmails();