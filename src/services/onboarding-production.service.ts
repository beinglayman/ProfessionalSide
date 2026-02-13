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
      const arrayFields = ['connectedTools', 'specializations', 'topSkills', 'skills', 'workExperiences', 'education', 'certifications', 'careerGoals', 'professionalInterests'];
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === null || cleanedData[key] === undefined) {
          if (arrayFields.includes(key)) {
            cleanedData[key] = [];
          } else {
            delete cleanedData[key];
          }
        }

        // Remove empty profileImageUrl to avoid validation errors
        if (key === 'profileImageUrl' && typeof cleanedData[key] === 'string' && cleanedData[key].trim() === '') {
          delete cleanedData[key];
        }
      });

      // Ensure array fields exist with default values
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
        
        // If onboarding is complete, calculate step from data
        if (response.data.data.isCompleted) {
          const onboardingData = await this.getOnboardingData();
          return this.calculateCurrentStepFromData(onboardingData);
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

  // Mark onboarding as skipped
  async markOnboardingSkipped(): Promise<void> {
    try {
      console.log('⏭️ Marking onboarding as skipped via API...');
      const response = await api.post('/onboarding/skip');
      
      if (response.data.success) {
        console.log('✅ Onboarding marked as skipped successfully');
      } else {
        throw new Error(response.data.error || 'Failed to skip onboarding');
      }
    } catch (error) {
      console.error('❌ Failed to mark onboarding as skipped:', error);
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

  // Calculate step completion based on data (2-step flow)
  calculateCurrentStepFromData(data: OnboardingData | null): number {
    if (!data) return 0;

    // Step 0: About You — need at least fullName
    if (!data.fullName) return 0;

    // Step 1: Connect Tools — need at least one connected tool
    if (!data.connectedTools?.length) return 1;

    // All steps complete
    return 1;
  }
}

export const productionOnboardingService = ProductionOnboardingService.getInstance();