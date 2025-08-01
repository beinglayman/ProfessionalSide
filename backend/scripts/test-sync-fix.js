const { PrismaClient } = require('@prisma/client');
const { OnboardingService } = require('../dist/services/onboarding.service.js');

const prisma = new PrismaClient();
const onboardingService = new OnboardingService();

async function testSyncFix() {
  try {
    console.log('🧪 Testing onboarding data synchronization fix...');
    
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
    
    console.log('\n📋 BEFORE - Current onboarding data:');
    const onboardingBefore = await prisma.onboardingData.findUnique({
      where: { userId },
      select: {
        fullName: true,
        currentTitle: true,
        currentCompany: true,
        location: true,
        industry: true,
        yearsOfExperience: true,
        profileImageUrl: true,
        professionalSummary: true
      }
    });
    console.log(onboardingBefore);
    
    console.log('\n🔄 Running synchronization...');
    
    // Manually trigger the synchronization by calling completeOnboarding
    // (This will sync the data even if it's already marked as complete)
    const result = await onboardingService.completeOnboarding(userId);
    
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
    
    console.log('\n🎉 Synchronization test completed!');
    console.log('📊 Changes made:');
    
    const changes = [];
    if (userBefore.name !== userAfter.name) {
      changes.push(`Name: "${userBefore.name}" → "${userAfter.name}"`);
    }
    if (userBefore.title !== userAfter.title) {
      changes.push(`Title: "${userBefore.title}" → "${userAfter.title}"`);
    }
    if (userBefore.company !== userAfter.company) {
      changes.push(`Company: "${userBefore.company}" → "${userAfter.company}"`);
    }
    if (userBefore.location !== userAfter.location) {
      changes.push(`Location: "${userBefore.location}" → "${userAfter.location}"`);
    }
    if (userBefore.industry !== userAfter.industry) {
      changes.push(`Industry: "${userBefore.industry}" → "${userAfter.industry}"`);
    }
    if (userBefore.yearsOfExperience !== userAfter.yearsOfExperience) {
      changes.push(`Years: ${userBefore.yearsOfExperience} → ${userAfter.yearsOfExperience}`);
    }
    
    if (changes.length > 0) {
      changes.forEach(change => console.log(`  ✅ ${change}`));
    } else {
      console.log('  ℹ️ No changes detected (data may have already been in sync)');
    }
    
  } catch (error) {
    console.error('❌ Error testing sync fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSyncFix();