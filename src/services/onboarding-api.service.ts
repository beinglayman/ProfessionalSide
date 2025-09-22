// API service for onboarding data persistence via user profile endpoints
import { OnboardingData } from './onboarding.service';
import { api, ApiResponse, handleApiError } from '../lib/api';


export class OnboardingApiService {
  private static instance: OnboardingApiService;
  private userId: string | null = null;

  private constructor() {
    // In a real app, get user ID from auth context
    this.userId = localStorage.getItem('user_id') || 'demo_user';
  }

  static getInstance(): OnboardingApiService {
    if (!OnboardingApiService.instance) {
      OnboardingApiService.instance = new OnboardingApiService();
    }
    return OnboardingApiService.instance;
  }

  // Save onboarding data to user profile
  async saveOnboardingData(data: Partial<OnboardingData>): Promise<void> {
    console.log('=== ONBOARDING API SERVICE SAVE START ===');
    console.log('📊 Input data:', data);

    try {
      // Validate required fields before sending to API
      if (data.fullName && data.fullName.length < 2) {
        console.log('⚠️ Skipping API save - name too short:', data.fullName);
        throw new Error('Name must be at least 2 characters');
      }

      if (data.currentTitle && data.currentTitle.length < 2) {
        console.log('⚠️ Skipping API save - title too short:', data.currentTitle);
        throw new Error('Title must be at least 2 characters');
      }

      // Skip API call if we don't have minimum viable data
      const hasMinViableData = (data.fullName && data.fullName.length >= 2) ||
                              (data.currentTitle && data.currentTitle.length >= 2) ||
                              data.profileImageUrl;

      if (!hasMinViableData) {
        console.log('⚠️ Skipping API save - no minimum viable data available');
        return; // Don't throw error, just skip silently
      }

      // Transform onboarding data to profile format for the API
      const profileData = this.transformOnboardingToProfile(data);
      console.log('🔄 Transformed profile data:', profileData);

      const response = await api.put<ApiResponse<any>>('/users/profile', profileData);
      console.log('✅ API save successful:', response.data);
      console.log('=== ONBOARDING API SERVICE SAVE END ===');

    } catch (error) {
      console.error('❌ Failed to save onboarding data to API:', error);

      // Fallback to localStorage if database fails
      console.log('💾 Attempting localStorage fallback...');
      const existingData = this.getLocalStorageData();
      const updatedData = { ...existingData, ...data };
      localStorage.setItem('onboarding_data', JSON.stringify(updatedData));
      console.log('✅ LocalStorage fallback completed');

      throw error;
    }
  }

  // Get onboarding data from user profile
  async getOnboardingData(): Promise<OnboardingData | null> {
    console.log('=== ONBOARDING API SERVICE GET START ===');

    try {
      const response = await api.get<ApiResponse<any>>('/users/profile/me');
      console.log('✅ API data retrieved:', response.data);

      // Transform profile data back to onboarding format
      const transformed = this.transformProfileToOnboarding(response.data);
      console.log('🔄 Transformed to onboarding format:', transformed);
      console.log('=== ONBOARDING API SERVICE GET END ===');

      return transformed;
    } catch (error: any) {
      console.error('❌ Failed to retrieve user profile from API:', error.message);

      // Check for 404 specifically
      if (error.response?.status === 404) {
        console.log('⚠️ No profile data found (404)');
        return null;
      }

      // Fallback to localStorage if database fails
      console.log('💾 Trying localStorage fallback...');
      const fallbackData = this.getLocalStorageData();
      console.log('💾 LocalStorage result:', fallbackData ? 'found' : 'null');
      return fallbackData;
    }
  }

  // Save specific step data (delegates to saveOnboardingData)
  async saveStepData(stepId: string, stepData: any): Promise<void> {
    // Simply delegate to saveOnboardingData with the step data
    return this.saveOnboardingData(stepData);
  }

  // Check if onboarding is complete based on profile data
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const data = await this.getOnboardingData();
      return data !== null && 
             !!data.fullName && 
             !!data.currentTitle && 
             !!data.professionalSummary && 
             !!data.skills && data.skills.length > 0;
    } catch (error) {
      console.error('Failed to check onboarding completion status:', error);
      
      // Fallback to local check
      const data = this.getLocalStorageData();
      return data !== null && 
             !!data.fullName && 
             !!data.currentTitle && 
             !!data.professionalSummary && 
             !!data.skills && data.skills.length > 0;
    }
  }

  // Mark onboarding as complete (handled automatically by profile completion)
  async markOnboardingComplete(): Promise<void> {
    // This is automatically determined by isOnboardingComplete()
    // based on profile data completeness, so no separate action needed
  }

  // Get current onboarding step based on profile completion
  async getCurrentStep(): Promise<number> {
    try {
      const data = await this.getOnboardingData();
      if (!data) return 0;
      
      let targetStep = 0;
      if (data.fullName && data.currentTitle) targetStep = Math.max(targetStep, 1);
      if (data.professionalSummary) targetStep = Math.max(targetStep, 2);
      if (data.skills?.length > 0) targetStep = Math.max(targetStep, 3);
      if (data.workExperiences?.length > 0) targetStep = Math.max(targetStep, 4);
      if (data.education?.length > 0) targetStep = Math.max(targetStep, 5);
      if (data.certifications?.length > 0) targetStep = Math.max(targetStep, 6);
      
      return targetStep;
    } catch (error) {
      console.error('Failed to calculate current step:', error);
      return 0;
    }
  }

  // Save current step (tracked automatically by profile completion)
  async saveCurrentStep(_step: number): Promise<void> {
    // Current step is automatically determined by getCurrentStep()
    // based on profile data completeness, so no separate storage needed
  }

  // Clear all onboarding data by resetting profile
  async clearOnboardingData(): Promise<void> {
    try {
      // Reset profile by sending empty/default values
      await api.put<ApiResponse<any>>('/users/profile', {
        name: '',
        title: '',
        company: '',
        location: '',
        industry: '',
        bio: '',
        specializations: [],
        careerHighlights: '',
        topSkills: [],
        careerGoals: [],
        professionalInterests: [],
        onboardingData: null
      });

    } catch (error) {
      console.error('Failed to clear profile data:', error);

      // Fallback to localStorage cleanup
      localStorage.removeItem('onboarding_data');
      localStorage.removeItem('onboarding_complete');
      localStorage.removeItem('onboarding_current_step');

      throw error;
    }
  }

  // Transform onboarding data to profile API format
  private transformOnboardingToProfile(data: Partial<OnboardingData>): Record<string, unknown> {
    return {
      ...(data.fullName && { name: data.fullName }),
      ...(data.currentTitle && { title: data.currentTitle }),
      ...(data.currentCompany && { company: data.currentCompany }),
      ...(data.location && { location: data.location }),
      ...(data.industry && { industry: data.industry }),
      ...(data.yearsOfExperience && { yearsOfExperience: data.yearsOfExperience }),
      ...(data.professionalSummary && { bio: data.professionalSummary }),
      ...(data.specializations && { specializations: data.specializations }),
      ...(data.careerHighlights && { careerHighlights: data.careerHighlights }),
      ...(data.topSkills && { topSkills: data.topSkills }),
      ...(data.careerGoals && { careerGoals: data.careerGoals }),
      ...(data.professionalInterests && { professionalInterests: data.professionalInterests }),
      // Store full onboarding data in metadata for complete retrieval
      onboardingData: data as Record<string, unknown>
    };
  }

  // Transform profile data back to onboarding format
  private transformProfileToOnboarding(profileData: Record<string, unknown>): OnboardingData | null {
    // First try to get data from stored onboarding metadata
    if (profileData.onboardingData) {
      return profileData.onboardingData;
    }

    // Otherwise, construct from profile fields
    return {
      fullName: profileData.name || '',
      currentTitle: profileData.title || '',
      currentCompany: profileData.company || '',
      industry: profileData.industry || '',
      yearsOfExperience: profileData.yearsOfExperience || 0,
      location: profileData.location || '',
      profileImageUrl: profileData.avatar || '',
      professionalSummary: profileData.bio || '',
      specializations: profileData.specializations || [],
      careerHighlights: profileData.careerHighlights || '',
      skills: [], // Would need to fetch from skills endpoint
      topSkills: profileData.topSkills || [],
      workExperiences: [], // Would need additional data
      education: [], // Would need additional data
      certifications: [], // Would need additional data
      careerGoals: profileData.careerGoals || [],
      professionalInterests: profileData.professionalInterests || []
    };
  }

  // Private helper for localStorage fallback
  private getLocalStorageData(): OnboardingData | null {
    const data = localStorage.getItem('onboarding_data');
    return data ? JSON.parse(data) : null;
  }

  // Upload profile image
  async uploadProfileImage(file: File): Promise<string> {
    try {
      const formData = createFormData({ avatar: file });

      const response = await apiFormData.post<ApiResponse<any>>('/users/avatar', formData);
      const imageUrl = response.data.data?.avatarUrl || response.data.avatarUrl;
      return imageUrl;
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      
      // Fallback to data URL for demo
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
  }
}

export const onboardingApiService = OnboardingApiService.getInstance();