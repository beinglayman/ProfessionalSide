// Onboarding data service
import { onboardingApiService } from './onboarding-api.service';
import { UserService } from './user.service';
import { queryClient } from '../lib/queryClient';
import { SafeStorage } from '../utils/storage';

interface OnboardingData {
  // Step 1: Professional Basics
  fullName: string;
  currentTitle: string;
  currentCompany: string;
  industry: string;
  yearsOfExperience: number;
  location: string;
  profileImageUrl: string;
  
  // Step 2: Bio & Summary
  professionalSummary: string;
  specializations: string[];
  careerHighlights: string;
  
  // Step 3: Skills & Expertise
  skills: Array<{
    name: string;
    proficiency: string;
    category: string;
  }>;
  topSkills: string[];
  
  // Step 4: Work Experience
  workExperiences: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrentRole: boolean;
    description: string;
    achievements: string[];
    skills: string[];
  }>;
  
  // Step 5: Education
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    location: string;
    startYear: string;
    endYear: string;
    isCurrentlyStudying: boolean;
    grade: string;
    description: string;
    activities: string[];
  }>;
  
  // Step 6: Certifications
  certifications: Array<{
    id: string;
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expirationDate: string;
    credentialId: string;
    credentialUrl: string;
    neverExpires: boolean;
    description: string;
    skills: string[];
  }>;
  
  // Step 7: Goals & Interests
  careerGoals: string[];
  professionalInterests: string[];
}

// Local storage key
const ONBOARDING_DATA_KEY = 'onboarding_data';
const MOCK_ONBOARDING_DATA_KEY = 'mock_onboarding_demo_user';

export const onboardingService = {
  // Save onboarding data (with database persistence)
  saveOnboardingData: async (data: OnboardingData): Promise<void> => {
    try {
      // Save onboarding data to API first
      await onboardingApiService.saveOnboardingData(data);

      // Also save to localStorage as backup
      SafeStorage.setItem(MOCK_ONBOARDING_DATA_KEY, JSON.stringify(data));
      
      // Also update user profile with the avatar and basic info
      if (data.profileImageUrl || data.fullName || data.currentTitle || data.currentCompany || data.location) {
        try {
          await UserService.updateProfile({
            ...(data.fullName && { name: data.fullName }),
            ...(data.currentTitle && { title: data.currentTitle }),
            ...(data.currentCompany && { company: data.currentCompany }),
            ...(data.location && { location: data.location }),
            ...(data.profileImageUrl && { avatar: data.profileImageUrl })
          });
          
          // Invalidate React Query caches to refresh data
          try {
            await queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
            await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
          } catch (cacheError) {
            console.warn('Failed to invalidate caches:', cacheError);
          }
        } catch (profileError) {
          console.warn('Failed to update user profile, but onboarding data was saved:', profileError);
        }
      }
    } catch (error) {
      console.error('Onboarding save failed, using localStorage fallback:', error);
      const success = SafeStorage.setItem(MOCK_ONBOARDING_DATA_KEY, JSON.stringify(data));
      if (!success) {
        throw new Error('Unable to save onboarding data - storage quota exceeded');
      }
    }
  },
  
  // Get onboarding data (from database with localStorage fallback)
  getOnboardingData: async (): Promise<OnboardingData | null> => {
    try {
      const apiData = await onboardingApiService.getOnboardingData();
      if (apiData) return apiData;
    } catch {
      // API failed — fall through to localStorage
    }

    // Check localStorage fallback
    const keys = [MOCK_ONBOARDING_DATA_KEY, ONBOARDING_DATA_KEY];
    const userId = localStorage.getItem('user_id') || 'demo_user';
    keys.push(`mock_onboarding_${userId}`);

    for (const key of keys) {
      const data = SafeStorage.getItem(key);
      if (data) return JSON.parse(data);
    }

    return null;
  },
  
  // Synchronous version for backward compatibility
  getOnboardingDataSync: (): OnboardingData | null => {
    // First try the mock API key, then fall back to the old key
    let data = SafeStorage.getItem(MOCK_ONBOARDING_DATA_KEY);
    if (!data) {
      data = SafeStorage.getItem(ONBOARDING_DATA_KEY);
    }
    // Also check for mock API service pattern (mock_onboarding_${userId})
    if (!data) {
      const userId = localStorage.getItem('user_id') || 'demo_user';
      data = SafeStorage.getItem(`mock_onboarding_${userId}`);
    }
    return data ? JSON.parse(data) : null;
  },
  
  // Check if onboarding is complete (basic requirements)
  isOnboardingComplete: async (): Promise<boolean> => {
    try {
      return await onboardingApiService.isOnboardingComplete();
    } catch (error) {
      console.error('Failed to check completion status from database, using localStorage fallback');
      const data = onboardingService.getOnboardingDataSync();
      return data !== null && 
             !!data.fullName && 
             !!data.currentTitle && 
             !!data.professionalSummary && 
             !!data.skills && data.skills.length > 0;
    }
  },
  
  // Synchronous version for backward compatibility
  isOnboardingCompleteSync: (): boolean => {
    const data = onboardingService.getOnboardingDataSync();
    return data !== null && 
           !!data.fullName && 
           !!data.currentTitle && 
           !!data.professionalSummary && 
           !!data.skills && data.skills.length > 0;
  },
  
  // Transform onboarding data to profile format
  transformToProfile: (data: OnboardingData) => {
    const transformed = {
      name: data.fullName || 'Your Name',
      title: data.currentTitle || 'Professional',
      avatar: data.profileImageUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      location: data.location || 'Location',
      company: data.currentCompany || 'Company',
      email: 'your.email@example.com', // This would come from auth context
      joined: new Date(), // This would come from auth context
      bio: data.professionalSummary,
      industry: data.industry,
      yearsOfExperience: data.yearsOfExperience,
      specializations: data.specializations || [],
      careerHighlights: data.careerHighlights,
      topSkills: data.topSkills || [],
      careerGoals: data.careerGoals || [],
      professionalInterests: data.professionalInterests || [],
      skills: (data.skills || []).map(skill => ({
        name: skill.name,
        level: skill.proficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        endorsements: 0,
        projects: 0,
        startDate: new Date(),
        relatedAchievements: [],
        category: skill.category,
      })),
      fullProfile: {
        workExperience: (data.workExperiences || []).map(exp => ({
          company: exp.company,
          title: exp.title,
          period: `${formatDate(exp.startDate)} - ${exp.isCurrentRole ? 'Present' : formatDate(exp.endDate)}`,
          description: exp.description,
          achievements: exp.achievements.filter(a => a.trim()),
          location: exp.location,
          skills: exp.skills || [],
        })),
        education: (data.education || []).map(edu => ({
          institution: edu.institution,
          degree: `${edu.degree} in ${edu.fieldOfStudy}`,
          period: `${edu.startYear} - ${edu.isCurrentlyStudying ? 'Present' : edu.endYear}`,
          highlights: edu.description || `${edu.degree} in ${edu.fieldOfStudy}`,
          location: edu.location,
          grade: edu.grade,
          activities: edu.activities?.filter(a => a.trim()) || [],
        })),
        certifications: (data.certifications || []).map(cert => ({
          name: cert.name,
          issuer: cert.issuingOrganization,
          date: formatDate(cert.issueDate),
          expiration: cert.neverExpires ? undefined : formatDate(cert.expirationDate),
          credentialId: cert.credentialId,
          credentialUrl: cert.credentialUrl,
          description: cert.description,
          skills: cert.skills || [],
        })),
        languages: [
          { name: 'English', proficiency: 'Native' }
        ],
      },
      achievements: [],
    };
    
    return transformed;
  },
  
  // Helper function to patch missing basic profile fields
  patchMissingBasicFields: async (basicFields: {
    fullName?: string;
    currentTitle?: string;
    currentCompany?: string;
    location?: string;
    profileImageUrl?: string;
    industry?: string;
    yearsOfExperience?: number;
  }): Promise<void> => {
    try {
      const existingData = await onboardingService.getOnboardingData();
      if (existingData) {
        const updatedData = { ...existingData, ...basicFields };
        await onboardingService.saveOnboardingData(updatedData);
      }
    } catch (error) {
      console.error('Failed to patch missing basic fields:', error);
    }
  },
  
  // Save step data (with database persistence)
  saveStepData: async (stepId: string, stepData: any): Promise<void> => {
    try {
      await onboardingApiService.saveStepData(stepId, stepData);
    } catch (error) {
      console.error('Failed to save step data to database, using localStorage fallback');
      const existingData = onboardingService.getOnboardingDataSync() || {};
      const updatedData = { ...existingData, ...stepData };
      const success = SafeStorage.setItem(MOCK_ONBOARDING_DATA_KEY, JSON.stringify(updatedData));
      if (!success) {
        console.error('Failed to save step data to localStorage due to quota or other issues');
        throw new Error('Unable to save step data - storage quota exceeded');
      }
    }
  },
  
  // Clear onboarding data (with database persistence)
  clearOnboardingData: async (): Promise<void> => {
    try {
      await onboardingApiService.clearOnboardingData();
    } catch (error) {
      console.error('Failed to clear from database, using localStorage fallback');
      SafeStorage.removeItem(MOCK_ONBOARDING_DATA_KEY);
      SafeStorage.removeItem(ONBOARDING_DATA_KEY);
    }
  },
  
  // Synchronous version for backward compatibility
  clearOnboardingDataSync: (): void => {
    SafeStorage.removeItem(MOCK_ONBOARDING_DATA_KEY);
    SafeStorage.removeItem(ONBOARDING_DATA_KEY);
  },
  
  // Get current step from database
  getCurrentStep: async (): Promise<number> => {
    try {
      return await onboardingApiService.getCurrentStep();
    } catch (error) {
      console.error('Failed to get current step from database, using localStorage fallback');
      const data = onboardingService.getOnboardingDataSync();
      if (!data) return 0;
      
      let targetStep = 0;
      if (data.fullName && data.currentTitle) targetStep = Math.max(targetStep, 1);
      if (data.professionalSummary) targetStep = Math.max(targetStep, 2);
      if (data.skills?.length > 0) targetStep = Math.max(targetStep, 3);
      if (data.workExperiences?.length > 0) targetStep = Math.max(targetStep, 4);
      if (data.education?.length > 0) targetStep = Math.max(targetStep, 5);
      if (data.certifications?.length > 0) targetStep = Math.max(targetStep, 6);
      
      return targetStep;
    }
  },
  
  // Save current step to database
  saveCurrentStep: async (step: number): Promise<void> => {
    try {
      await onboardingApiService.saveCurrentStep(step);
    } catch (error) {
      console.error('Failed to save current step to database, using localStorage fallback');
      SafeStorage.setItem('onboarding_current_step', step.toString());
    }
  },

  // Create test onboarding data
  createTestData: async (): Promise<void> => {
    // Clear existing data first
    await onboardingService.clearOnboardingData();
    
    const testData: OnboardingData = {
      fullName: 'Sarah Johnson',
      currentTitle: 'Senior Software Engineer',
      currentCompany: 'Google',
      industry: 'Technology',
      yearsOfExperience: 5,
      location: 'San Francisco, CA',
      profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      professionalSummary: 'Experienced software engineer with expertise in React, TypeScript, and modern web technologies. Passionate about building scalable applications and mentoring junior developers.',
      specializations: ['Frontend Development', 'React.js', 'TypeScript'],
      careerHighlights: 'Led development of award-winning e-commerce platform, Mentored 10+ junior developers',
      skills: [
        { name: 'React.js', proficiency: 'expert', category: 'Frontend Technologies' },
        { name: 'TypeScript', proficiency: 'advanced', category: 'Programming Languages' },
        { name: 'Node.js', proficiency: 'intermediate', category: 'Backend Technologies' },
        { name: 'Product Management', proficiency: 'intermediate', category: 'Product Management' }
      ],
      topSkills: ['React.js', 'TypeScript', 'Node.js'],
      workExperiences: [
        {
          id: '1',
          title: 'Senior Software Engineer',
          company: 'Google',
          location: 'San Francisco, CA',
          startDate: '2022-01',
          endDate: '',
          isCurrentRole: true,
          description: 'Lead frontend development for core products, mentor junior developers, and architect scalable solutions.',
          achievements: ['Improved app performance by 40%', 'Led migration to TypeScript', 'Mentored 5 junior developers'],
          skills: ['React.js', 'TypeScript', 'Node.js']
        }
      ],
      education: [
        {
          id: '1',
          institution: 'Stanford University',
          degree: 'Bachelor\'s Degree',
          fieldOfStudy: 'Computer Science',
          location: 'Stanford, CA',
          startYear: '2014',
          endYear: '2018',
          isCurrentlyStudying: false,
          grade: '3.9/4.0',
          description: 'Focused on software engineering and algorithms',
          activities: ['Computer Science Society', 'Hackathons']
        }
      ],
      certifications: [
        {
          id: '1',
          name: 'AWS Certified Developer',
          issuingOrganization: 'Amazon Web Services',
          issueDate: '2023-01',
          expirationDate: '2026-01',
          credentialId: 'AWS-DEV-123456',
          credentialUrl: 'https://aws.amazon.com/certification/',
          neverExpires: false,
          description: 'Certified in AWS development practices',
          skills: ['AWS', 'Cloud Development']
        }
      ],
      careerGoals: ['Become a Tech Lead', 'Start My Own Company'],
      professionalInterests: ['Artificial Intelligence & Machine Learning', 'Cloud Computing & DevOps']
    };

    await onboardingService.saveOnboardingData(testData);
  },
  
  // Manually sync existing onboarding data to user profile
  syncOnboardingToProfile: async (): Promise<void> => {
    try {
      const existingData = await onboardingService.getOnboardingData();
      if (!existingData) return;
      
      if (existingData.profileImageUrl || existingData.fullName || existingData.currentTitle || existingData.currentCompany || existingData.location) {
        try {
          await UserService.updateProfile({
            ...(existingData.fullName && { name: existingData.fullName }),
            ...(existingData.currentTitle && { title: existingData.currentTitle }),
            ...(existingData.currentCompany && { company: existingData.currentCompany }),
            ...(existingData.location && { location: existingData.location }),
            ...(existingData.profileImageUrl && { avatar: existingData.profileImageUrl })
          });
          // Invalidate React Query caches
          try {
            await queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
            await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
          } catch {
            // Cache invalidation is best-effort
          }
          
          // Trigger a custom event to notify components to refresh
          window.dispatchEvent(new CustomEvent('profileUpdated'));
          
        } catch (profileError) {
          throw profileError;
        }
      }
    } catch (error) {
      throw error;
    }
  },
  
  // Storage management utilities
  getStorageInfo: (): void => {
    SafeStorage.getStorageReport();
  },
  
  cleanupStorage: (): void => {
    SafeStorage.cleanup();
  },
  
  emergencyCleanupStorage: (): void => {
    SafeStorage.emergencyCleanup();
  },
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
};

export type { OnboardingData };