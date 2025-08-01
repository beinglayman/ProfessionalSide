// Production-ready onboarding service - NO localStorage dependencies
import { api } from '../lib/api';
import { OnboardingData } from './onboarding.service';

interface OnboardingProgress {
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
  completionPercentage: number;
}

interface OnboardingStatus {
  isOnboardingRequired: boolean;
  isOnboardingComplete: boolean;
  currentStep: number;
  data?: OnboardingData;
}

class ProductionOnboardingService {
  private static instance: ProductionOnboardingService;

  static getInstance(): ProductionOnboardingService {
    if (!ProductionOnboardingService.instance) {
      ProductionOnboardingService.instance = new ProductionOnboardingService();
    }
    return ProductionOnboardingService.instance;
  }

  // Get onboarding data from API only
  async getOnboardingData(): Promise<OnboardingData | null> {
    try {
      console.log('📡 Fetching onboarding data from API...');
      const response = await api.get('/onboarding/data');
      
      if (response.data.success && response.data.data) {
        console.log('✅ Onboarding data retrieved from API:', response.data.data);
        console.log('🔍 Retrieved careerGoals:', response.data.data.careerGoals);
        console.log('🔍 Retrieved professionalInterests:', response.data.data.professionalInterests);
        return response.data.data;
      }
      
      console.log('⚠️ No onboarding data found in API');
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch onboarding data from API:', error);
      throw new Error('Failed to load onboarding data');
    }
  }

  // Save onboarding data to API only
  async saveOnboardingData(data: Partial<OnboardingData>): Promise<void> {
    try {
      // Clean the data - remove system fields and fix null values
      const cleanedData = { ...data };
      
      // Remove system fields that the API handles internally
      delete cleanedData.id;
      delete cleanedData.userId;
      delete cleanedData.createdAt;
      delete cleanedData.updatedAt;
      delete cleanedData.completedAt;
      delete cleanedData.currentStep; // Step management is handled separately
      delete cleanedData.isCompleted; // Completion status is handled separately
      
      // Convert null values to appropriate defaults to match validation schema
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === null || cleanedData[key] === undefined) {
          // Array fields that have .default([]) in schema should be empty arrays, not null
          if (['specializations', 'topSkills', 'skills', 'workExperiences', 'education', 'certifications', 'careerGoals', 'professionalInterests'].includes(key)) {
            cleanedData[key] = [];
          } else {
            // Remove null/undefined fields entirely - let API handle defaults
            delete cleanedData[key];
          }
        }
        
        // Special handling for URL fields - remove empty strings to avoid validation errors
        if (key === 'profileImageUrl' && typeof cleanedData[key] === 'string' && cleanedData[key].trim() === '') {
          console.log('🔧 Removing empty profileImageUrl to avoid validation error');
          delete cleanedData[key];
        }
      });
      
      // Also ensure array fields exist with default values even if they weren't null
      const arrayFields = ['specializations', 'topSkills', 'skills', 'workExperiences', 'education', 'certifications', 'careerGoals', 'professionalInterests'];
      arrayFields.forEach(field => {
        if (cleanedData[field] === undefined) {
          cleanedData[field] = [];
        }
      });
      
      console.log('💾 Saving onboarding data to API:', cleanedData);
      console.log('💾 Checking careerGoals in cleaned data:', cleanedData.careerGoals);
      console.log('💾 Checking professionalInterests in cleaned data:', cleanedData.professionalInterests);
      const response = await api.put('/onboarding/data', cleanedData);
      
      if (response.data.success) {
        console.log('✅ Onboarding data saved successfully');
      } else {
        throw new Error(response.data.error || 'Failed to save onboarding data');
      }
    } catch (error: any) {
      console.error('❌ Failed to save onboarding data:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error details:', error.response?.data?.details);
      
      // Log each validation error individually for easier debugging
      if (error.response?.data?.details) {
        error.response.data.details.forEach((detail: any, index: number) => {
          console.error(`❌ Validation Error ${index + 1}:`, detail);
        });
      }
      throw error;
    }
  }

  // Get current step from API
  async getCurrentStep(): Promise<number> {
    try {
      console.log('📡 Fetching current step from API...');
      const response = await api.get('/onboarding/progress');
      
      if (response.data.success && response.data.data) {
        const step = response.data.data.currentStep || 0;
        console.log('✅ Current step retrieved from API:', step);
        
        // If onboarding is complete, check if user is editing profile
        // and calculate the appropriate step based on data completeness
        if (response.data.data.isCompleted) {
          console.log('🔍 Onboarding is complete, calculating step from data...');
          const onboardingData = await this.getOnboardingData();
          const calculatedStep = this.calculateCurrentStepFromData(onboardingData);
          console.log('📍 Calculated step from data:', calculatedStep);
          
          // If all data is complete, go to last step (Goals & Interests) for editing
          if (calculatedStep >= 6) {
            console.log('📍 All data complete, directing to last step for editing');
            return 6;
          }
          
          return calculatedStep;
        }
        
        return step;
      }
      
      console.log('⚠️ No progress data found, starting from step 0');
      return 0;
    } catch (error) {
      console.error('❌ Failed to fetch current step from API:', error);
      return 0; // Default to first step on error
    }
  }

  // Get onboarding progress from API
  async getOnboardingProgress(): Promise<{ currentStep: number; isCompleted: boolean; totalSteps: number } | null> {
    try {
      console.log('📡 Fetching onboarding progress from API...');
      const response = await api.get('/onboarding/progress');
      
      if (response.data.success && response.data.data) {
        console.log('✅ Progress data retrieved from API:', response.data.data);
        return response.data.data;
      }
      
      console.log('⚠️ No progress data found');
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch progress from API:', error);
      return null;
    }
  }

  // Save current step to API
  async saveCurrentStep(step: number): Promise<void> {
    try {
      console.log('💾 Saving current step to API:', step);
      const response = await api.put('/onboarding/step', { currentStep: step });
      
      if (response.data.success) {
        console.log('✅ Current step saved successfully:', step);
      } else {
        throw new Error(response.data.error || 'Failed to save current step');
      }
    } catch (error) {
      console.error('❌ Failed to save current step:', error);
      throw error;
    }
  }

  // Update specific step data
  async saveStepData(stepNumber: number, stepData: Partial<OnboardingData>): Promise<void> {
    try {
      console.log(`💾 Saving step ${stepNumber} data to API:`, stepData);
      const response = await api.put(`/onboarding/step/${stepNumber}`, stepData);
      
      if (response.data.success) {
        console.log(`✅ Step ${stepNumber} data saved successfully`);
      } else {
        throw new Error(response.data.error || `Failed to save step ${stepNumber} data`);
      }
    } catch (error) {
      console.error(`❌ Failed to save step ${stepNumber} data:`, error);
      throw error;
    }
  }

  // Get onboarding progress
  async getOnboardingProgress(): Promise<OnboardingProgress> {
    try {
      console.log('📡 Fetching onboarding progress from API...');
      const response = await api.get('/onboarding/progress');
      
      if (response.data.success && response.data.data) {
        console.log('✅ Onboarding progress retrieved:', response.data.data);
        return response.data.data;
      }
      
      // Default progress structure
      const defaultProgress: OnboardingProgress = {
        currentStep: 0,
        completedSteps: [],
        isComplete: false,
        completionPercentage: 0
      };
      
      console.log('⚠️ No progress data found, returning default:', defaultProgress);
      return defaultProgress;
    } catch (error) {
      console.error('❌ Failed to fetch onboarding progress:', error);
      
      // Return default progress on error
      return {
        currentStep: 0,
        completedSteps: [],
        isComplete: false,
        completionPercentage: 0
      };
    }
  }

  // Check onboarding status
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    try {
      console.log('📡 Fetching onboarding status from API...');
      const response = await api.get('/onboarding/status');
      
      if (response.data.success && response.data.data) {
        console.log('✅ Onboarding status retrieved:', response.data.data);
        return response.data.data;
      }
      
      // Default status
      const defaultStatus: OnboardingStatus = {
        isOnboardingRequired: true,
        isOnboardingComplete: false,
        currentStep: 0
      };
      
      console.log('⚠️ No status data found, returning default:', defaultStatus);
      return defaultStatus;
    } catch (error) {
      console.error('❌ Failed to fetch onboarding status:', error);
      
      // Return default status on error
      return {
        isOnboardingRequired: true,
        isOnboardingComplete: false,
        currentStep: 0
      };
    }
  }

  // Check if onboarding is complete
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const status = await this.getOnboardingStatus();
      return status.isOnboardingComplete;
    } catch (error) {
      console.error('❌ Failed to check onboarding completion:', error);
      return false;
    }
  }

  // Mark onboarding as complete
  async markOnboardingComplete(): Promise<void> {
    try {
      console.log('🎉 Marking onboarding as complete via API...');
      const response = await api.post('/onboarding/complete');
      
      if (response.data.success) {
        console.log('✅ Onboarding marked as complete successfully');
      } else {
        throw new Error(response.data.error || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('❌ Failed to mark onboarding as complete:', error);
      throw error;
    }
  }

  // Reset onboarding (for admin/testing purposes)
  async resetOnboarding(): Promise<void> {
    try {
      console.log('🔄 Resetting onboarding via API...');
      const response = await api.delete('/onboarding/reset');
      
      if (response.data.success) {
        console.log('✅ Onboarding reset successfully');
      } else {
        throw new Error(response.data.error || 'Failed to reset onboarding');
      }
    } catch (error) {
      console.error('❌ Failed to reset onboarding:', error);
      throw error;
    }
  }

  // Upload profile image (delegates to user profile API)
  async uploadProfileImage(file: File): Promise<string> {
    try {
      console.log('🔄 Uploading profile image...');
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success && response.data.data?.avatarUrl) {
        console.log('✅ Profile image uploaded successfully:', response.data.data.avatarUrl);
        return response.data.data.avatarUrl;
      } else {
        throw new Error(response.data.error || 'Failed to upload profile image');
      }
    } catch (error) {
      console.error('❌ Failed to upload profile image:', error);
      throw error;
    }
  }

  // Calculate step completion based on data
  calculateCurrentStepFromData(data: OnboardingData | null): number {
    if (!data) {
      console.log('📍 No data found, starting at step 0');
      return 0;
    }
    
    console.log('🔍 Calculating current step from data:', data);
    
    // Check each step's completion requirements
    if (!data.fullName || !data.currentTitle) {
      console.log('📍 Step 0 incomplete - missing basic info');
      return 0; // Professional Basics
    }
    
    if (!data.professionalSummary || !data.specializations?.length) {
      console.log('📍 Step 1 incomplete - missing bio/summary');
      return 1; // Bio & Summary
    }
    
    if (!data.skills?.length || !data.topSkills?.length) {
      console.log('📍 Step 2 incomplete - missing skills');
      return 2; // Skills & Expertise
    }
    
    if (!data.workExperiences?.length) {
      console.log('📍 Step 3 incomplete - missing work experience');
      return 3; // Work Experience
    }
    
    if (!data.education?.length) {
      console.log('📍 Step 4 incomplete - missing education');
      return 4; // Education
    }
    
    // Certifications are optional - skip if empty and check goals
    if (!data.careerGoals?.length || !data.professionalInterests?.length) {
      // If certifications exist but goals don't, go to goals step
      if (data.certifications?.length) {
        console.log('📍 Step 6 incomplete - missing goals/interests');
        return 6; // Goals & Interests
      } else {
        console.log('📍 Step 5 incomplete - missing certifications (or can skip to goals)');
        return 5; // Certifications (but they can skip)
      }
    }
    
    console.log('📍 All required steps complete!');
    return 6; // All complete, stay on last step
  }
}

export const productionOnboardingService = ProductionOnboardingService.getInstance();