const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addUserToAllWorkspaces() {
  console.log('🚀 Starting to add honeyarora@gmail.com to all workspaces...');
  
  try {
    // Check if user exists, if not create them
    let user = await prisma.user.findUnique({
      where: { email: 'honeyarora@gmail.com' }
    });

    if (!user) {
      console.log('👤 User not found. Creating honeyarora@gmail.com...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Create user
      user = await prisma.user.create({
        data: {
          email: 'honeyarora@gmail.com',
          password: hashedPassword,
          name: 'Honey Arora',
          title: 'Professional',
          company: 'Technology Professional',
          location: 'Remote',
          bio: 'Technology professional with expertise in software development and product management.',
          isActive: true
        }
      });

      // Create user profile
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          profileCompleteness: 60,
          showEmail: true,
          showLocation: true,
          showCompany: true
        }
      });

      // Create notification preferences
      await prisma.notificationPreferences.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          pushNotifications: true,
          likes: true,
          comments: true,
          mentions: true,
          workspaceInvites: true,
          achievements: true,
          systemUpdates: true,
          digestFrequency: 'DAILY'
        }
      });

      console.log('✅ Created user honeyarora@gmail.com successfully!');
    } else {
      console.log('👤 User honeyarora@gmail.com already exists.');
    }

    // Get all workspaces
    const workspaces = await prisma.workspace.findMany({
      include: {
        organization: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    console.log(`📊 Found ${workspaces.length} workspaces:`);
    workspaces.forEach(workspace => {
      console.log(`   - ${workspace.name} (${workspace.organization.name}) - ${workspace._count.members} members`);
    });

    // Add user to all workspaces
    let addedCount = 0;
    let alreadyMemberCount = 0;

    for (const workspace of workspaces) {
      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: workspace.id
          }
        }
      });

      if (existingMember) {
        console.log(`   ⚠️  Already a member of ${workspace.name}`);
        alreadyMemberCount++;
      } else {
        // Add user as a member
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: 'member',
            isActive: true
          }
        });
        console.log(`   ✅ Added to ${workspace.name} (${workspace.organization.name})`);
        addedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Added to ${addedCount} workspaces`);
    console.log(`   ⚠️  Already member of ${alreadyMemberCount} workspaces`);
    console.log(`   📊 Total workspaces: ${workspaces.length}`);

    // Verify the user's workspace memberships
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log('\n🔍 Verification - User is now a member of:');
    userWorkspaces.forEach(member => {
      console.log(`   - ${member.workspace.name} (${member.workspace.organization.name}) - Role: ${member.role}`);
    });

    console.log('\n🎉 Successfully added honeyarora@gmail.com to all workspaces!');
    console.log('📧 Login credentials:');
    console.log('   Email: honeyarora@gmail.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
addUserToAllWorkspaces()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });