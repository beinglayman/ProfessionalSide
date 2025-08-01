// Production-ready onboarding service
import { profileApiService } from './profile-api.service';
import { OnboardingData } from './onboarding.service';

class OnboardingService {
  private static instance: OnboardingService;

  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  // Save onboarding data - API only
  async saveOnboardingData(data: Partial<OnboardingData>): Promise<void> {
    console.log('💾 Saving onboarding data:', data);
    
    try {
      await profileApiService.updateProfile(data);
      console.log('✅ Onboarding data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save onboarding data:', error);
      throw error;
    }
  }

  // Get onboarding data - API with localStorage fallback
  async getOnboardingData(): Promise<OnboardingData | null> {
    try {
      // Try API first
      const profile = await profileApiService.getProfile();
      console.log('🔍 Profile data received in onboarding service:', profile);
      console.log('🔍 Profile basic fields:', {
        name: profile?.name,
        title: profile?.title,
        company: profile?.company,
        location: profile?.location,
        industry: profile?.industry,
        yearsOfExperience: profile?.yearsOfExperience
      });
      
      if (profile.onboardingData && Object.keys(profile.onboardingData).length > 0) {
        console.log('✅ Using stored onboardingData:', profile.onboardingData);
        console.log('🔍 Stored onboarding fields count:', Object.keys(profile.onboardingData).length);
        
        // Ensure ALL fields are properly populated and preserved
        const completeData = {
          // Start with all onboarding data
          ...profile.onboardingData,
          // Ensure basic fields are populated from profile if not in onboarding data
          fullName: profile.onboardingData.fullName || profile.name || '',
          currentTitle: profile.onboardingData.currentTitle || profile.title || '',
          currentCompany: profile.onboardingData.currentCompany || profile.company || '',
          location: profile.onboardingData.location || profile.location || '',
          industry: profile.onboardingData.industry || profile.industry || '',
          yearsOfExperience: profile.onboardingData.yearsOfExperience ?? profile.yearsOfExperience ?? 0,
          profileImageUrl: profile.onboardingData.profileImageUrl || profile.avatar || '',
          // Explicitly preserve ALL onboarding-specific fields
          professionalSummary: profile.onboardingData.professionalSummary || '',
          specializations: profile.onboardingData.specializations || [],
          careerHighlights: profile.onboardingData.careerHighlights || '',
          skills: profile.onboardingData.skills || [],
          topSkills: profile.onboardingData.topSkills || [],
          workExperiences: profile.onboardingData.workExperiences || [],
          education: profile.onboardingData.education || [],
          certifications: profile.onboardingData.certifications || [],
          careerGoals: profile.onboardingData.careerGoals || [],
          professionalInterests: profile.onboardingData.professionalInterests || [],
        };
        
        console.log('📦 Complete onboarding data with fallbacks:', completeData);
        return completeData;
      }
      
      // Transform profile data back to onboarding format
      console.log('🔄 No stored onboarding data, transforming profile to onboarding format');
      const transformed = profileApiService.transformProfileToOnboarding(profile);
      console.log('📊 Transformed onboarding data:', transformed);
      console.log('🔍 Transformed basic fields:', {
        fullName: transformed?.fullName,
        currentTitle: transformed?.currentTitle,
        currentCompany: transformed?.currentCompany,
        location: transformed?.location,
        industry: transformed?.industry,
        yearsOfExperience: transformed?.yearsOfExperience
      });
      return transformed;
    } catch (error) {
      console.error('❌ API failed, falling back to localStorage:', error);
      
      // Fallback to localStorage when API fails
      try {
        const storedData = localStorage.getItem('onboarding_complete_data');
        if (storedData) {
          console.log('🔍 Found localStorage data, parsing...');
          const onboardingData = JSON.parse(storedData);
          
          if (onboardingData.type === 'onboarding_data' && onboardingData.data) {
            console.log('✅ Using localStorage onboarding data:', onboardingData.data);
            console.log('🔍 LocalStorage data keys:', Object.keys(onboardingData.data));
            return onboardingData.data;
          }
        }
        
        console.log('⚠️ No valid localStorage onboarding data found');
      } catch (localStorageError) {
        console.error('❌ Failed to parse localStorage data:', localStorageError);
      }
      
      return null;
    }
  }

  // Check if onboarding is complete
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const data = await this.getOnboardingData();
      return Boolean(
        data?.fullName &&
        data?.currentTitle &&
        data?.professionalSummary &&
        data?.skills && data.skills.length > 0
      );
    } catch (error) {
      console.error('❌ Failed to check onboarding completion:', error);
      return false;
    }
  }

  // Upload profile image
  async uploadProfileImage(file: File): Promise<string> {
    console.log('🔄 Onboarding Service: Starting profile image upload');
    console.log('🔍 Onboarding Service: File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    try {
      console.log('🔄 Onboarding Service: Delegating to profileApiService.uploadAvatar');
      const result = await profileApiService.uploadAvatar(file);
      console.log('✅ Onboarding Service: Upload successful, result:', result);
      return result;
    } catch (error) {
      console.error('❌ Onboarding Service: Failed to upload profile image:', error);
      throw error;
    }
  }

  // Save step data (delegates to main save)
  async saveStepData(stepId: string, stepData: Partial<OnboardingData>): Promise<void> {
    return this.saveOnboardingData(stepData);
  }

  // Get current step - prioritizes saved step, falls back to data completeness
  async getCurrentStep(): Promise<number> {
    return this.getCurrentStepFromStorage();
  }

  // Get current step based on data completeness - returns the NEXT step to complete
  async getCurrentStepFromData(): Promise<number> {
    try {
      let data = await this.getOnboardingData();
      
      // If no data from API/onboarding service, try localStorage directly
      if (!data) {
        console.log('🔍 No data from onboarding service, checking localStorage directly...');
        try {
          const storedData = localStorage.getItem('onboarding_complete_data');
          if (storedData) {
            const onboardingData = JSON.parse(storedData);
            if (onboardingData.type === 'onboarding_data' && onboardingData.data) {
              data = onboardingData.data;
              console.log('✅ Using localStorage data for step calculation:', data);
            }
          }
        } catch (error) {
          console.error('❌ Failed to parse localStorage for step calculation:', error);
        }
      }
      
      console.log('🔍 Checking step completion with data:', data);
      
      if (!data) {
        console.log('📍 No data found, starting at step 0');
        return 0;
      }
      
      // Check each step's completion and return the next step to complete
      if (!data.fullName || !data.currentTitle) {
        console.log('📍 Step 1 incomplete - missing basic info');
        return 0; // Go to step 1 (basics)
      }
      
      if (!data.professionalSummary || !data.specializations?.length) {
        console.log('📍 Step 2 incomplete - missing bio/summary');
        console.log('📍 professionalSummary:', data.professionalSummary ? 'EXISTS' : 'MISSING');
        console.log('📍 specializations:', data.specializations?.length || 0, 'items');
        return 1; // Go to step 2 (bio)
      }
      
      if (!data.skills?.length || !data.topSkills?.length) {
        console.log('📍 Step 3 incomplete - missing skills data');
        console.log('📍 Skills:', data.skills?.length || 0, 'items:', data.skills);
        console.log('📍 TopSkills:', data.topSkills?.length || 0, 'items:', data.topSkills);
        return 2; // Go to step 3 (skills)
      }
      
      if (!data.workExperiences?.length) {
        console.log('📍 Step 4 incomplete - missing work experience');
        return 3; // Go to step 4 (work experience)
      }
      
      if (!data.education?.length) {
        console.log('📍 Step 5 incomplete - missing education');
        return 4; // Go to step 5 (education)
      }
      
      if (!data.certifications?.length) {
        console.log('📍 Step 6 incomplete - missing certifications');
        return 5; // Go to step 6 (certifications)
      }
      
      if (!data.careerGoals?.length || !data.professionalInterests?.length) {
        console.log('📍 Step 7 incomplete - missing goals/interests');
        return 6; // Go to step 7 (goals/interests)
      }
      
      console.log('📍 All steps complete!');
      return 6; // All steps complete, stay on last step
    } catch (error) {
      console.error('❌ Failed to get current step:', error);
      return 0;
    }
  }

  // Save current step to localStorage for persistence during refresh
  async saveCurrentStep(step: number): Promise<void> {
    try {
      localStorage.setItem('onboarding_current_step', step.toString());
      localStorage.setItem('onboarding_in_progress', 'true');
      console.log(`📍 Current step saved: ${step} (onboarding in progress)`);
    } catch (error) {
      console.error('❌ Failed to save current step:', error);
    }
  }

  // Get saved step from localStorage, fallback to data-based calculation
  async getCurrentStepFromStorage(): Promise<number> {
    try {
      const savedStep = localStorage.getItem('onboarding_current_step');
      const onboardingInProgress = localStorage.getItem('onboarding_in_progress');
      
      if (savedStep !== null && onboardingInProgress === 'true') {
        const step = parseInt(savedStep, 10);
        console.log(`📍 Restored step from storage (onboarding in progress): ${step}`);
        
        // Ensure step is within valid bounds (0-6 for 7 steps)
        const maxStep = 6; // Last step index
        if (step > maxStep) {
          console.warn(`⚠️ Saved step ${step} exceeds max step ${maxStep}, clamping to ${maxStep}`);
          return maxStep;
        }
        
        return step;
      }
      
      // If no onboarding in progress flag or saved step, use data calculation
      console.log(`📍 No active onboarding session, using data-based calculation`);
    } catch (error) {
      console.error('❌ Failed to get step from storage:', error);
    }
    
    // Fallback to data-based calculation
    return this.getCurrentStepFromData();
  }

  // Mark onboarding as complete and clear step storage
  async markOnboardingComplete(): Promise<void> {
    try {
      // Clear the saved step and progress flag since onboarding is complete
      localStorage.removeItem('onboarding_current_step');
      localStorage.removeItem('onboarding_in_progress');
      console.log('✅ Onboarding marked as complete and step storage cleared');
    } catch (error) {
      console.error('❌ Failed to clear onboarding step storage:', error);
    }
  }

  // Clear onboarding progress (but keep data)
  async clearOnboardingProgress(): Promise<void> {
    try {
      // Clear localStorage progress indicators without clearing data
      localStorage.removeItem('onboarding_current_step');
      localStorage.removeItem('onboarding_in_progress');
      console.log('✅ Onboarding progress cleared - will restart from data-based calculation');
    } catch (error) {
      console.error('❌ Failed to clear onboarding progress:', error);
      throw error;
    }
  }

  // Clear onboarding data (for admin/reset purposes)
  async clearOnboardingData(): Promise<void> {
    try {
      // In production, we'd typically not allow clearing all data
      // Instead, we might reset specific fields or mark as incomplete
      console.warn('⚠️ Clear onboarding data not implemented in production');
    } catch (error) {
      console.error('❌ Failed to clear onboarding data:', error);
      throw error;
    }
  }
}

export const onboardingCleanService = OnboardingService.getInstance();