const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOnboardingData() {
  try {
    console.log('🔍 Checking onboarding data for inviter x18honey@iima.ac.in...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: 'x18honey@iima.ac.in'
      },
      include: {
        onboardingData: true
      }
    });
    
    if (user) {
      console.log('👤 User Basic Info:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Name:', user.name);
      console.log('  Title:', user.title);
      console.log('  Company:', user.company);
      console.log('  Location:', user.location);
      console.log('  Bio:', user.bio);
      console.log('  Avatar:', user.avatar);
      console.log('  Years of Experience:', user.yearsOfExperience);
      console.log('  Industry:', user.industry);
      console.log('  Account Created:', user.createdAt);
      console.log('  Last Updated:', user.updatedAt);
      
      console.log('\n📋 Onboarding Data:');
      if (user.onboardingData) {
        console.log('  ✅ Onboarding data exists!');
        console.log('  ID:', user.onboardingData.id);
        console.log('  Full Name:', user.onboardingData.fullName);
        console.log('  Current Title:', user.onboardingData.currentTitle);
        console.log('  Current Company:', user.onboardingData.currentCompany);
        console.log('  Location:', user.onboardingData.location);
        console.log('  Industry:', user.onboardingData.industry);
        console.log('  Years of Experience:', user.onboardingData.yearsOfExperience);
        console.log('  Professional Summary:', user.onboardingData.professionalSummary ? 'EXISTS' : 'MISSING');
        console.log('  Profile Image URL:', user.onboardingData.profileImageUrl);
        console.log('  Current Step:', user.onboardingData.currentStep);
        console.log('  Is Completed:', user.onboardingData.isCompleted);
        console.log('  Created:', user.onboardingData.createdAt);
        console.log('  Updated:', user.onboardingData.updatedAt);
        console.log('  Completed At:', user.onboardingData.completedAt);
        
        console.log('\n🎯 Analysis:');
        const hasOnboardingName = user.onboardingData.fullName && user.onboardingData.fullName !== 'User';
        const hasOnboardingTitle = user.onboardingData.currentTitle;
        const hasOnboardingCompany = user.onboardingData.currentCompany;
        
        if (hasOnboardingName || hasOnboardingTitle || hasOnboardingCompany) {
          console.log('  🔍 Onboarding data contains proper info:');
          if (hasOnboardingName) console.log('    ✅ Name:', user.onboardingData.fullName);
          if (hasOnboardingTitle) console.log('    ✅ Title:', user.onboardingData.currentTitle);
          if (hasOnboardingCompany) console.log('    ✅ Company:', user.onboardingData.currentCompany);
          
          console.log('\n  ⚠️  BUT the main user record still shows:');
          console.log('    - Name:', user.name);
          console.log('    - Title:', user.title);
          console.log('    - Company:', user.company);
          
          console.log('\n  🔧 This suggests the onboarding data was saved but not synchronized to the main user record!');
        } else {
          console.log('  ❌ Onboarding data exists but doesn\'t contain proper name/title/company info');
        }
        
      } else {
        console.log('  ❌ No onboarding data found - data might be only in localStorage');
      }
      
    } else {
      console.log('❌ User not found with email x18honey@iima.ac.in');
    }
    
  } catch (error) {
    console.error('❌ Error checking onboarding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOnboardingData();