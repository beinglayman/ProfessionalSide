const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function manualSyncTest() {
  try {
    console.log('🧪 Manual synchronization test...');
    
    const userId = 'cmdmjb0ce000979wz30k2y2m9'; // The inviter user
    
    console.log('\n📋 BEFORE - Current user record:');
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        title: true,
        company: true,
        location: true,
        industry: true,
        yearsOfExperience: true,
        avatar: true,
        bio: true
      }
    });
    console.log(userBefore);
    
    console.log('\n📋 Current onboarding data:');
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });
    
    if (!onboardingData) {
      console.log('❌ No onboarding data found');
      return;
    }
    
    console.log('Onboarding data fields:');
    console.log('  fullName:', onboardingData.fullName);
    console.log('  currentTitle:', onboardingData.currentTitle);
    console.log('  currentCompany:', onboardingData.currentCompany);
    console.log('  location:', onboardingData.location);
    console.log('  industry:', onboardingData.industry);
    console.log('  yearsOfExperience:', onboardingData.yearsOfExperience);
    console.log('  profileImageUrl:', onboardingData.profileImageUrl);
    
    console.log('\n🔄 Manually syncing data...');
    
    // Build the update object with mapped fields
    const userUpdateData = {};
    
    if (onboardingData.fullName) {
      userUpdateData.name = onboardingData.fullName;
      console.log('  ✅ Mapping fullName →', onboardingData.fullName);
    }
    
    if (onboardingData.currentTitle) {
      userUpdateData.title = onboardingData.currentTitle;
      console.log('  ✅ Mapping currentTitle →', onboardingData.currentTitle);
    }
    
    if (onboardingData.currentCompany) {
      userUpdateData.company = onboardingData.currentCompany;
      console.log('  ✅ Mapping currentCompany →', onboardingData.currentCompany);
    }
    
    if (onboardingData.location) {
      userUpdateData.location = onboardingData.location;
      console.log('  ✅ Mapping location →', onboardingData.location);
    }
    
    if (onboardingData.industry) {
      userUpdateData.industry = onboardingData.industry;
      console.log('  ✅ Mapping industry →', onboardingData.industry);
    }
    
    if (onboardingData.yearsOfExperience !== null && onboardingData.yearsOfExperience !== undefined) {
      userUpdateData.yearsOfExperience = onboardingData.yearsOfExperience;
      console.log('  ✅ Mapping yearsOfExperience →', onboardingData.yearsOfExperience);
    }
    
    if (onboardingData.profileImageUrl) {
      userUpdateData.avatar = onboardingData.profileImageUrl;
      console.log('  ✅ Mapping profileImageUrl →', onboardingData.profileImageUrl);
    }
    
    if (onboardingData.professionalSummary) {
      userUpdateData.bio = onboardingData.professionalSummary;
      console.log('  ✅ Mapping professionalSummary → bio');
    }
    
    // Apply the updates
    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = new Date();
      
      console.log('\n📝 Applying updates to user record...');
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      });
      
      console.log('✅ Successfully updated user record');
      
      console.log('\n📋 AFTER - Updated user record:');
      const userAfter = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          title: true,
          company: true,
          location: true,
          industry: true,
          yearsOfExperience: true,
          avatar: true,
          bio: true
        }
      });
      console.log(userAfter);
      
      console.log('\n🎉 Manual synchronization completed successfully!');
      
    } else {
      console.log('⚠️ No data to synchronize');
    }
    
  } catch (error) {
    console.error('❌ Error in manual sync test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSyncTest();