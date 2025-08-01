const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupTestData() {
  try {
    // Create an organization
    const org = await prisma.organization.create({
      data: {
        id: 'org-techcorp',
        name: 'TechCorp Inc.',
        domain: 'techcorp.com',
        description: 'A leading technology company'
      }
    });
    console.log('Created organization:', org.name);
    
    // Create the user that the frontend token expects
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        id: '5582f77a-545f-48ab-8c78-170070dbcfec',
        email: 'honeyarora93@gmail.com',
        name: 'Honey Arora',
        password: hashedPassword,
        avatar: null,
        title: 'Software Engineer',
        company: 'TechCorp Inc.'
      }
    });
    console.log('Created user:', user.name);
    
    // Create user profile
    const userProfile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        profileCompleteness: 80,
        showEmail: false,
        showLocation: true,
        showCompany: true,
        experience: '3+ years in full-stack development',
        education: 'Computer Science Graduate',
        certifications: 'AWS Solutions Architect',
        languages: 'English, Hindi'
      }
    });
    console.log('Created user profile');
    
    // Update the existing workspace to have the organization
    await prisma.workspace.update({
      where: { id: 'cmcyi6mbt0000t43s03fdrjz0' },
      data: {
        organizationId: org.id
      }
    });
    console.log('Updated workspace to have organization');
    
    // Add the new user as a member of the workspace
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: 'cmcyi6mbt0000t43s03fdrjz0',
        role: 'ADMIN'
      }
    });
    console.log('Added user as workspace member');
    
    // Create a second workspace for testing
    const workspace2 = await prisma.workspace.create({
      data: {
        name: 'Marketing Campaigns',
        description: 'Marketing team workspace for campaign management',
        organizationId: org.id,
        members: {
          create: {
            userId: user.id,
            role: 'MEMBER'
          }
        }
      }
    });
    console.log('Created second workspace:', workspace2.name);
    
    console.log('\nTest data setup complete!');
    
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();