import { PrismaClient } from '@prisma/client';
import {
  CreateOnboardingDataInput,
  UpdateOnboardingDataInput,
  UpdateOnboardingStepInput,
  CompleteOnboardingInput,
  OnboardingDataResponse
} from '../types/onboarding.types';

const prisma = new PrismaClient();

export class OnboardingService {
  /**
   * Get user's onboarding data
   */
  async getOnboardingData(userId: string): Promise<OnboardingDataResponse | null> {
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });

    return onboardingData;
  }

  /**
   * Create or update onboarding data
   */
  async upsertOnboardingData(userId: string, data: UpdateOnboardingDataInput): Promise<OnboardingDataResponse> {
    const existingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });

    let updatedOnboardingData: OnboardingDataResponse;

    if (existingData) {
      // Update existing onboarding data
      updatedOnboardingData = await prisma.onboardingData.update({
        where: { userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new onboarding data
      updatedOnboardingData = await prisma.onboardingData.create({
        data: {
          userId,
          ...data
        }
      });
    }

    // Sync data to main user record (for fields like name, title, company, etc.)
    // Only sync if we have substantial profile data (not just step updates)
    const hasProfileData = data.fullName || data.currentTitle || data.currentCompany || 
                          data.location || data.industry || data.yearsOfExperience || 
                          data.profileImageUrl || data.professionalSummary;
    
    if (hasProfileData) {
      await this.syncOnboardingDataToUser(userId, updatedOnboardingData);
    }

    return updatedOnboardingData;
  }

  /**
   * Update current step
   */
  async updateCurrentStep(userId: string, data: UpdateOnboardingStepInput): Promise<OnboardingDataResponse> {
    // Ensure onboarding data exists
    await this.ensureOnboardingDataExists(userId);

    return await prisma.onboardingData.update({
      where: { userId },
      data: {
        currentStep: data.currentStep,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(userId: string): Promise<OnboardingDataResponse> {
    // Ensure onboarding data exists
    await this.ensureOnboardingDataExists(userId);

    // Get the current onboarding data
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });

    if (!onboardingData) {
      throw new Error('Onboarding data not found');
    }

    // Synchronize onboarding data to main user record
    await this.syncOnboardingDataToUser(userId, onboardingData);

    // Mark onboarding as complete
    return await prisma.onboardingData.update({
      where: { userId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete onboarding data (reset onboarding)
   */
  async deleteOnboardingData(userId: string): Promise<void> {
    await prisma.onboardingData.deleteMany({
      where: { userId }
    });
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId },
      select: { isCompleted: true }
    });

    return onboardingData?.isCompleted || false;
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<{ currentStep: number; isCompleted: boolean; totalSteps: number }> {
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId },
      select: { currentStep: true, isCompleted: true }
    });

    return {
      currentStep: onboardingData?.currentStep || 0,  // Start at step 0 (Professional Basics)
      isCompleted: onboardingData?.isCompleted || false,
      totalSteps: 7
    };
  }

  /**
   * Ensure onboarding data exists for user
   */
  private async ensureOnboardingDataExists(userId: string): Promise<void> {
    const existingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });

    if (!existingData) {
      await prisma.onboardingData.create({
        data: {
          userId,
          currentStep: 0,
          isCompleted: false
        }
      });
    }
  }

  /**
   * Update specific step data
   */
  async updateStepData(userId: string, stepNumber: number, stepData: any): Promise<OnboardingDataResponse> {
    // Ensure onboarding data exists
    await this.ensureOnboardingDataExists(userId);

    // Update the current step if this step is higher
    const currentData = await prisma.onboardingData.findUnique({
      where: { userId },
      select: { currentStep: true }
    });

    const updateData: any = {
      ...stepData,
      updatedAt: new Date()
    };

    // Update current step if this is a progression
    if (!currentData || stepNumber > currentData.currentStep) {
      updateData.currentStep = stepNumber;
    }

    return await prisma.onboardingData.update({
      where: { userId },
      data: updateData
    });
  }

  /**
   * Public method to manually sync onboarding data for users with incomplete profiles
   */
  async manualSyncOnboardingData(userId: string): Promise<boolean> {
    console.log('🔧 Manual sync requested for user:', userId);
    
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });
    
    if (!onboardingData) {
      console.log('❌ No onboarding data found for user:', userId);
      return false;
    }
    
    await this.syncOnboardingDataToUser(userId, onboardingData);
    return true;
  }

  /**
   * Synchronize onboarding data to main user record
   * Maps onboarding_data fields to users table fields
   */
  private async syncOnboardingDataToUser(userId: string, onboardingData: any): Promise<void> {
    console.log('🔄 Synchronizing onboarding data to main user record for user:', userId);
    
    // Build the update object with mapped fields
    const userUpdateData: any = {};
    
    // Map onboarding fields to user fields
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
    
    // Update the main user record if we have data to sync
    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = new Date();
      
      console.log('📝 Updating main user record with:', Object.keys(userUpdateData));
      
      await prisma.users.update({
        where: { id: userId },
        data: userUpdateData
      });
      
      console.log('✅ Successfully synchronized onboarding data to main user record');
    } else {
      console.log('⚠️ No data to synchronize from onboarding to user record');
    }
  }

  /**
   * Create a personal workspace for the user
   */
  async createPersonalWorkspace(userId: string): Promise<any> {
    console.log('🏢 Creating personal workspace for user:', userId);
    
    // Check if user already has a personal workspace
    const existingPersonalWorkspace = await prisma.workspace.findFirst({
      where: {
        isPersonal: true,
        members: {
          some: {
            userId: userId,
            role: 'owner'
          }
        }
      }
    });
    
    if (existingPersonalWorkspace) {
      console.log('✅ Personal workspace already exists:', existingPersonalWorkspace.id);
      return existingPersonalWorkspace;
    }
    
    // Get user name for workspace description
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    
    // Create the personal workspace
    const personalWorkspace = await prisma.workspace.create({
      data: {
        name: 'My Workspace',
        description: `${user?.name || 'Your'} personal workspace for individual goals and journal entries`,
        isPersonal: true,
        allowTeamMembers: false,
        members: {
          create: {
            userId: userId,
            role: 'owner',
            permissions: {}
          }
        }
      },
      include: {
        members: true
      }
    });
    
    console.log('✅ Created personal workspace:', personalWorkspace.id);
    return personalWorkspace;
  }

  /**
   * Complete onboarding and create personal workspace
   */
  async completeOnboardingWithWorkspace(userId: string, data: CompleteOnboardingInput): Promise<boolean> {
    console.log('🎉 Completing onboarding with workspace creation for user:', userId);
    
    try {
      // Complete regular onboarding process
      await this.completeOnboarding(userId, data);
      
      // Create personal workspace
      await this.createPersonalWorkspace(userId);
      
      console.log('✅ Onboarding completed with personal workspace created');
      return true;
    } catch (error) {
      console.error('❌ Error completing onboarding with workspace:', error);
      throw error;
    }
  }

  /**
   * Skip onboarding and create personal workspace
   */
  async skipOnboardingWithWorkspace(userId: string): Promise<boolean> {
    console.log('⏭️ Skipping onboarding with workspace creation for user:', userId);
    
    try {
      // Mark user as having skipped onboarding
      await prisma.users.update({
        where: { id: userId },
        data: {
          onboardingSkipped: true,
          updatedAt: new Date()
        }
      });
      
      // Create personal workspace
      await this.createPersonalWorkspace(userId);
      
      console.log('✅ Onboarding skipped with personal workspace created');
      return true;
    } catch (error) {
      console.error('❌ Error skipping onboarding with workspace:', error);
      throw error;
    }
  }
}