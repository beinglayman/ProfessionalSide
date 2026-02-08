// Production-ready profile API service
import { OnboardingData } from './onboarding.service';

import { API_BASE_URL } from '../lib/api';

export interface ProfileData {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  avatar: string;
  bio: string;
  industry: string;
  yearsOfExperience: number;
  specializations: string[];
  careerHighlights: string;
  topSkills: string[];
  careerGoals: string[];
  professionalInterests: string[];
  workExperiences?: any[];
  education?: any[];
  certifications?: any[];
  onboardingData?: OnboardingData;
}

class ProfileApiService {
  private getFullAvatarUrl(avatarUrl: string): string {
    if (!avatarUrl || avatarUrl === '/default-avatar.svg') {
      return '/default-avatar.svg';
    }
    
    // If URL is already absolute, ensure it's HTTPS for Azure domains
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      // Convert HTTP to HTTPS for Azure domains
      if (avatarUrl.includes('azurewebsites.net') && avatarUrl.startsWith('http://')) {
        return avatarUrl.replace('http://', 'https://');
      }
      return avatarUrl;
    }
    
    // If URL is relative, make it absolute with API base URL
    if (avatarUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${avatarUrl}`;
    }
    
    return avatarUrl;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('inchronicle_access_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Helper method for retrying API calls
  private async retryApiCall<T>(
    apiCall: () => Promise<Response>,
    errorContext: string,
    maxRetries: number = 2
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 ${errorContext}: Attempt ${attempt}/${maxRetries + 1}`);
        const response = await apiCall();
        
        if (response.ok) {
          console.log(`✅ ${errorContext}: Success on attempt ${attempt}`);
          return response;
        }
        
        // Don't retry auth errors or client errors (except 400)
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        // For 400 errors, log details and don't retry
        if (response.status === 400) {
          const errorText = await response.text();
          console.error(`❌ ${errorContext}: 400 error details:`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          throw new Error(`HTTP 400: ${errorText}`);
        }
        
        // Retry for server errors and other 400s
        if (attempt <= maxRetries) {
          console.warn(`⚠️ ${errorContext}: Attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      } catch (error) {
        lastError = error as Error;
        if (attempt <= maxRetries && !lastError.message.includes('401') && !lastError.message.includes('403')) {
          console.warn(`⚠️ ${errorContext}: Attempt ${attempt} failed, retrying...`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw lastError;
      }
    }
    
    throw lastError!;
  }

  async getProfile(): Promise<ProfileData> {
    try {
      console.log('🔍 Starting profile data fetch...');
      
      // 1. Get basic profile data with retry
      const response = await this.retryApiCall(
        () => fetch(`${API_BASE_URL}/users/profile/me`, {
          headers: this.getAuthHeaders(),
        }),
        'Profile fetch'
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        if (response.status === 404) {
          throw new Error('Profile not found');
        }
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const profileData = await response.json();
      console.log('🔍 Raw backend profile response:', profileData);
      console.log('🔍 Backend user fields:', {
        name: profileData.data?.name,
        title: profileData.data?.title,
        company: profileData.data?.company,
        location: profileData.data?.location,
        bio: profileData.data?.bio
      });

      // 2. Get skills data from skills API with retry
      console.log('🔍 Fetching skills data...');
      const skillsData = await this.getUserSkillsWithRetry();
      
      // 3. Get onboarding data from experience field with retry
      console.log('🔍 Fetching onboarding data...');
      const onboardingData = await this.getStoredOnboardingDataWithRetry(profileData.data || profileData);
      
      // 4. Transform and combine all data
      return this.transformBackendProfileToFrontend(profileData.data || profileData, skillsData, onboardingData);
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      throw error;
    }
  }

  async getPublicProfile(userId: string): Promise<ProfileData> {
    try {
      console.log(`🔍 Fetching public profile for user: ${userId}`);
      
      // 1. Get public profile data
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if available for better data access
          ...(localStorage.getItem('inchronicle_access_token') && {
            'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
          })
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(`Failed to fetch public profile: ${response.status}`);
      }

      const profileData = await response.json();
      console.log('🔍 Raw backend public profile response:', profileData);
      console.log('🔍 Backend skills in profile:', profileData.data?.skills || profileData.skills);
      console.log('🔍 Backend workExperiences:', profileData.data?.workExperiences || profileData.workExperiences);
      console.log('🔍 Backend education:', profileData.data?.education || profileData.education);
      console.log('🔍 Backend certifications:', profileData.data?.certifications || profileData.certifications);

      // 2. Get public skills data - use skills from profile response first
      const profileSkills = profileData.data?.skills || profileData.skills || [];
      const skillsData = profileSkills.length > 0 ? profileSkills : await this.getPublicUserSkills(userId);
      
      console.log('🔍 Final skills data for transformation:', skillsData);
      
      // 3. Transform and combine public data (no onboarding data for public profiles)
      return this.transformBackendProfileToFrontend(profileData.data || profileData, skillsData, null);
    } catch (error) {
      console.error('❌ Failed to fetch public profile:', error);
      throw error;
    }
  }

  // Helper method to get user skills from skills API
  private async getUserSkills(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/skills/my`, {
        headers: this.getAuthHeaders(),
      });
      
      if (response.ok) {
        const skillsResponse = await response.json();
        console.log('🔍 Skills from API:', skillsResponse.data);
        return skillsResponse.data || [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch skills:', error);
    }
    return [];
  }

  // Helper method to get user skills with retry
  private async getUserSkillsWithRetry(): Promise<any[]> {
    try {
      const response = await this.retryApiCall(
        () => fetch(`${API_BASE_URL}/users/skills/my`, {
          headers: this.getAuthHeaders(),
        }),
        'Skills fetch'
      );
      
      const skillsResponse = await response.json();
      console.log('🔍 Skills from API:', skillsResponse.data);
      return skillsResponse.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch skills after retries:', error);
      return [];
    }
  }

  // Helper method to get public user skills
  private async getPublicUserSkills(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/skills`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const skillsResponse = await response.json();
        console.log('🔍 Public skills from API:', skillsResponse.data);
        return skillsResponse.data || [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch public skills:', error);
    }
    return [];
  }

  // Helper method to extract onboarding data from API database
  private async getStoredOnboardingData(profileData: any): Promise<any | null> {
    try {
      console.log('🔍 Fetching onboarding data from API database...');
      
      // Fetch onboarding data from the API database
      const response = await fetch(`${API_BASE_URL}/onboarding/data`, {
        headers: this.getAuthHeaders(),
      });
      
      if (response.ok) {
        const apiData = await response.json();
        if (apiData.success && apiData.data) {
          console.log('✅ Found onboarding data in API database:', apiData.data);
          console.log('🔍 API onboarding fields:', {
            professionalSummary: apiData.data?.professionalSummary ? 'EXISTS' : 'MISSING',
            specializations: apiData.data?.specializations?.length || 0,
            skills: typeof apiData.data?.skills === 'object' ? (Array.isArray(apiData.data.skills) ? apiData.data.skills.length : 'JSON_OBJECT') : 0,
            topSkills: apiData.data?.topSkills?.length || 0,
            careerGoals: apiData.data?.careerGoals?.length || 0,
            professionalInterests: apiData.data?.professionalInterests?.length || 0
          });
          console.log('🔍 DEBUG API careerGoals:', apiData.data?.careerGoals);
          console.log('🔍 DEBUG API professionalInterests:', apiData.data?.professionalInterests);
          
          // Transform API data to frontend format
          const transformedData = {
            fullName: apiData.data.fullName || '',
            currentTitle: apiData.data.currentTitle || '',
            currentCompany: apiData.data.currentCompany || '',
            location: apiData.data.location || '',
            industry: apiData.data.industry || '',
            yearsOfExperience: apiData.data.yearsOfExperience || 0,
            profileImageUrl: apiData.data.profileImageUrl || '',
            professionalSummary: apiData.data.professionalSummary || '',
            specializations: apiData.data.specializations || [],
            careerHighlights: apiData.data.careerHighlights || '',
            // Handle skills JSON field
            skills: Array.isArray(apiData.data.skills) ? apiData.data.skills : 
                   (typeof apiData.data.skills === 'object' && apiData.data.skills) ? 
                   Object.values(apiData.data.skills) : [],
            topSkills: apiData.data.topSkills || [],
            workExperiences: Array.isArray(apiData.data.workExperiences) ? apiData.data.workExperiences :
                           (typeof apiData.data.workExperiences === 'object' && apiData.data.workExperiences) ?
                           Object.values(apiData.data.workExperiences) : [],
            education: Array.isArray(apiData.data.education) ? apiData.data.education :
                      (typeof apiData.data.education === 'object' && apiData.data.education) ?
                      Object.values(apiData.data.education) : [],
            certifications: Array.isArray(apiData.data.certifications) ? apiData.data.certifications :
                           (typeof apiData.data.certifications === 'object' && apiData.data.certifications) ?
                           Object.values(apiData.data.certifications) : [],
            careerGoals: apiData.data.careerGoals || [],
            professionalInterests: apiData.data.professionalInterests || [],
          };
          
          console.log('🔄 Transformed API data:', transformedData);
          return transformedData;
        }
      }
      
      console.log('⚠️ No onboarding data found in API, trying localStorage fallback...');
      
      // Fallback to localStorage (for backward compatibility)
      const storedData = localStorage.getItem('onboarding_complete_data');
      
      if (storedData) {
        console.log('🔍 Found onboarding data in localStorage, parsing');
        const onboardingData = JSON.parse(storedData);
        console.log('🔍 Parsed localStorage data:', onboardingData);
        
        if (onboardingData.type === 'onboarding_data') {
          console.log('✅ Using localStorage fallback data:', onboardingData.data);
          return onboardingData.data;
        }
      }
      
      // If no API or localStorage data, try to construct from user profile data
      console.log('⚠️ No onboarding data found, constructing from profile');
      
      if (profileData) {
        const constructedData = {
          fullName: profileData.name || '',
          currentTitle: profileData.title || '',
          currentCompany: profileData.company || '',
          location: profileData.location || '',
          industry: profileData.industry || '',
          yearsOfExperience: profileData.yearsOfExperience || 0,
          profileImageUrl: profileData.avatar || '',
          professionalSummary: profileData.bio?.split('\n\nIndustry:')[0]?.trim() || profileData.bio || '',
          specializations: [],
          careerHighlights: '',
          skills: [],
          topSkills: [],
          workExperiences: profileData.workExperiences || [],
          education: profileData.education || [],
          certifications: profileData.certifications || [],
          careerGoals: [],
          professionalInterests: []
        };
        
        console.log('🔧 Constructed onboarding data from profile:', constructedData);
        return constructedData;
      }
      
      console.log('⚠️ No profile data available for construction');
    } catch (error) {
      console.error('❌ Failed to fetch onboarding data from API:', error);
      
      // Try localStorage fallback on API error
      try {
        const storedData = localStorage.getItem('onboarding_complete_data');
        if (storedData) {
          const onboardingData = JSON.parse(storedData);
          if (onboardingData.type === 'onboarding_data') {
            console.log('✅ Using localStorage fallback after API error:', onboardingData.data);
            return onboardingData.data;
          }
        }
      } catch (localStorageError) {
        console.error('❌ LocalStorage fallback also failed:', localStorageError);
      }
    }
    return null;
  }

  // Helper method to extract onboarding data with retry
  private async getStoredOnboardingDataWithRetry(profileData: any): Promise<any | null> {
    try {
      console.log('🔍 Fetching onboarding data with retry...');
      
      // Fetch onboarding data from the API database with retry
      const response = await this.retryApiCall(
        () => fetch(`${API_BASE_URL}/onboarding/data`, {
          headers: this.getAuthHeaders(),
        }),
        'Onboarding data fetch'
      );
      
      const apiData = await response.json();
      if (apiData.success && apiData.data) {
        console.log('✅ Found onboarding data in API database:', apiData.data);
        
        // Transform API data to frontend format
        const transformedData = {
          fullName: apiData.data.fullName || '',
          currentTitle: apiData.data.currentTitle || '',
          currentCompany: apiData.data.currentCompany || '',
          location: apiData.data.location || '',
          industry: apiData.data.industry || '',
          yearsOfExperience: apiData.data.yearsOfExperience || 0,
          profileImageUrl: apiData.data.profileImageUrl || '',
          professionalSummary: apiData.data.professionalSummary || '',
          specializations: apiData.data.specializations || [],
          careerHighlights: apiData.data.careerHighlights || '',
          skills: Array.isArray(apiData.data.skills) ? apiData.data.skills : 
                 (typeof apiData.data.skills === 'object' && apiData.data.skills) ? 
                 Object.values(apiData.data.skills) : [],
          topSkills: apiData.data.topSkills || [],
          workExperiences: Array.isArray(apiData.data.workExperiences) ? apiData.data.workExperiences :
                         (typeof apiData.data.workExperiences === 'object' && apiData.data.workExperiences) ?
                         Object.values(apiData.data.workExperiences) : [],
          education: Array.isArray(apiData.data.education) ? apiData.data.education :
                    (typeof apiData.data.education === 'object' && apiData.data.education) ?
                    Object.values(apiData.data.education) : [],
          certifications: Array.isArray(apiData.data.certifications) ? apiData.data.certifications :
                         (typeof apiData.data.certifications === 'object' && apiData.data.certifications) ?
                         Object.values(apiData.data.certifications) : [],
          careerGoals: apiData.data.careerGoals || [],
          professionalInterests: apiData.data.professionalInterests || [],
        };
        
        console.log('🔄 Transformed API data with retry:', transformedData);
        return transformedData;
      }
      
      console.log('⚠️ No onboarding data in API response, using fallback...');
      return this.getStoredOnboardingData(profileData);
    } catch (error) {
      console.error('❌ Failed to fetch onboarding data after retries:', error);
      return this.getStoredOnboardingData(profileData);
    }
  }

  async updateProfile(data: Partial<OnboardingData>): Promise<ProfileData> {
    console.log('🔄 ProfileAPI: Received onboarding data to save:', data);
    console.log('🔍 ProfileAPI: Data keys:', Object.keys(data));
    const token = localStorage.getItem('inchronicle_access_token');
    console.log('🔍 ProfileAPI: Auth token exists:', !!token);
    console.log('🔍 ProfileAPI: Auth token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'null');
    console.log('🔍 ProfileAPI: API_BASE_URL:', API_BASE_URL);
    
    let profileResponse: Response;
    
    try {
      // Transform onboarding data to backend format with relational structure
      console.log('🔄 ProfileAPI: Transforming data to backend format...');
      const profileData = this.transformOnboardingToBackendFormat(data);
      console.log('🔄 ProfileAPI: Transformed profile data:', profileData);

      console.log('🔄 ProfileAPI: Making PUT request to /users/profile...');
      profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      console.log('📡 ProfileAPI: Response status:', profileResponse.status);
      console.log('📡 ProfileAPI: Response headers:', Object.fromEntries(profileResponse.headers.entries()));

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('❌ ProfileAPI: Profile update failed');
        console.error('❌ ProfileAPI: Status:', profileResponse.status);
        console.error('❌ ProfileAPI: Error text:', errorText);
        console.error('❌ ProfileAPI: Request data was:', profileData);
        throw new Error(`Failed to update profile: ${profileResponse.status} - ${errorText}`);
      }

      // Store complete onboarding data for prepopulation (before skills API call)
      console.log('🔍 DEBUG: About to store onboarding data:', {
        careerGoals: data.careerGoals,
        professionalInterests: data.professionalInterests,
        dataKeys: Object.keys(data)
      });
      await this.storeOnboardingData(data);

      // Update skills using the proper skills API
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        await this.updateUserSkills(data.skills, data.topSkills || []);
      }

      const result = await profileResponse.json();
      console.log('✅ ProfileAPI: Profile updated successfully');
      return result;
    } catch (error) {
      console.error('❌ ProfileAPI: Exception during profile update:', error);
      throw error;
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    console.log('🔄 Profile API Service: Starting avatar upload');
    console.log('🔍 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    const token = localStorage.getItem('inchronicle_access_token');
    console.log('🔍 Auth token exists:', !!token);
    console.log('🔍 API_BASE_URL:', API_BASE_URL);

    const formData = new FormData();
    formData.append('avatar', file);

    console.log('🔄 Making request to:', `${API_BASE_URL}/users/avatar`);

    try {
      const response = await fetch(`${API_BASE_URL}/users/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed with response:', errorText);
        throw new Error(`Failed to upload avatar: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful, response:', result);
      
      const avatarUrl = result.data?.avatarUrl || result.avatarUrl;
      console.log('🔍 Extracted avatar URL:', avatarUrl);
      
      return avatarUrl;
    } catch (error) {
      console.error('❌ Upload error details:', error);
      throw error;
    }
  }

  // Helper method to update skills using the backend's skills API
  private async updateUserSkills(skills: any[], topSkills: string[] = []): Promise<void> {
    console.log('🔄 Updating skills via backend skills API');
    
    try {
      // First, get existing skills to avoid duplicates
      const existingSkillsResponse = await fetch(`${API_BASE_URL}/users/skills/my`, {
        headers: this.getAuthHeaders(),
      });
      
      const existingSkills = existingSkillsResponse.ok ? await existingSkillsResponse.json() : { data: [] };
      const existingSkillNames = existingSkills.data?.map((skill: any) => skill.skill?.name || skill.skillName) || [];
      
      // Add new skills that don't exist
      for (const skill of skills) {
        const skillName = skill.name || skill;
        if (!existingSkillNames.includes(skillName)) {
          await this.addSingleSkill({
            skillName: skillName,
            category: skill.category || 'Technical',
            level: skill.proficiency || 'intermediate',
            yearsOfExp: 1,
            projects: 0,
            isVisible: topSkills.includes(skillName)
          });
        }
      }
      
      console.log('✅ Skills updated successfully via skills API');
    } catch (error) {
      console.error('❌ Failed to update skills via API:', error);
      // Don't throw error - continue with profile update even if skills fail
    }
  }

  // Helper method to add a single skill
  private async addSingleSkill(skillData: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/skills`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(skillData),
    });
    
    if (!response.ok) {
      console.error('❌ Failed to add skill:', skillData.skillName);
    }
  }

  // Helper method to store complete onboarding data in localStorage
  private async storeOnboardingData(data: Partial<OnboardingData>): Promise<void> {
    console.log('🔄 Storing complete onboarding data in localStorage:', data);
    console.log('🔍 Onboarding data fields to store:', {
      professionalSummary: data.professionalSummary ? 'EXISTS' : 'MISSING',
      specializations: data.specializations?.length || 0,
      skills: data.skills?.length || 0,
      topSkills: data.topSkills?.length || 0,
      careerGoals: data.careerGoals?.length || 0,
      professionalInterests: data.professionalInterests?.length || 0
    });
    console.log('🔍 DEBUG: careerGoals being stored:', data.careerGoals);
    console.log('🔍 DEBUG: professionalInterests being stored:', data.professionalInterests);
    
    try {
      // Check if we're trying to overwrite existing goals/interests with empty arrays
      const existingData = localStorage.getItem('onboarding_complete_data');
      let finalData = data;
      
      if (existingData) {
        const existing = JSON.parse(existingData);
        if (existing.type === 'onboarding_data' && existing.data) {
          const hasExistingGoals = existing.data.careerGoals?.length > 0;
          const hasExistingInterests = existing.data.professionalInterests?.length > 0;
          const newGoalsEmpty = !data.careerGoals || data.careerGoals.length === 0;
          const newInterestsEmpty = !data.professionalInterests || data.professionalInterests.length === 0;
          
          if ((hasExistingGoals && newGoalsEmpty) || (hasExistingInterests && newInterestsEmpty)) {
            console.log('🛡️ Preventing overwrite of goals/interests with empty arrays');
            console.log('🔍 Existing goals:', existing.data.careerGoals?.length || 0, 'New goals:', data.careerGoals?.length || 0);
            console.log('🔍 Existing interests:', existing.data.professionalInterests?.length || 0, 'New interests:', data.professionalInterests?.length || 0);
            
            // Preserve existing goals/interests if new ones are empty
            finalData = {
              ...data,
              careerGoals: (hasExistingGoals && newGoalsEmpty) ? existing.data.careerGoals : data.careerGoals,
              professionalInterests: (hasExistingInterests && newInterestsEmpty) ? existing.data.professionalInterests : data.professionalInterests
            };
            
            console.log('🔧 Final data with preserved goals/interests:', {
              careerGoals: finalData.careerGoals?.length || 0,
              professionalInterests: finalData.professionalInterests?.length || 0
            });
          }
        }
      }
      
      // Store complete onboarding data in localStorage for persistence
      const onboardingData = {
        type: 'onboarding_data',
        data: finalData,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('onboarding_complete_data', JSON.stringify(onboardingData));
      console.log('✅ Onboarding data stored successfully in localStorage');
    } catch (error) {
      console.error('❌ Error storing onboarding data in localStorage:', error);
    }
  }

  private transformOnboardingToProfile(data: Partial<OnboardingData>) {
    console.log('🔄 Transforming onboarding data to backend format:', data);
    
    // Send basic profile fields that the backend accepts
    const backendData: any = {
      ...(data.fullName && { name: data.fullName }),
      ...(data.currentTitle && { title: data.currentTitle }),
      ...(data.currentCompany && { company: data.currentCompany }),
      ...(data.location && { location: data.location }),
      ...(data.industry && { industry: data.industry }),
      ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
      ...(data.profileImageUrl && { avatar: data.profileImageUrl }),
    };

    // Handle bio with enhanced information
    let baseBio = data.professionalSummary || '';
    
    // Clean the bio by removing any existing additional info to prevent duplication
    baseBio = baseBio.replace(/\n\nIndustry:.*$/s, '').trim();
    
    const additionalInfo = [];
    if (data.industry) additionalInfo.push(`Industry: ${data.industry}`);
    if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) {
      additionalInfo.push(`Years of Experience: ${data.yearsOfExperience}`);
    }
    if (data.careerHighlights) additionalInfo.push(`Career Highlights: ${data.careerHighlights}`);
    
    if (additionalInfo.length > 0) {
      const enhancedBio = baseBio + '\n\n' + additionalInfo.join('\n');
      backendData.bio = enhancedBio.trim();
    } else {
      backendData.bio = baseBio;
    }

    console.log('✅ Basic profile payload:', backendData);
    return backendData;
  }

  private transformOnboardingToBackendFormat(data: Partial<OnboardingData>) {
    console.log('🔄 Transforming onboarding data to new backend format:', data);
    
    // Send basic profile fields that the backend accepts
    const backendData: any = {
      ...(data.fullName && { name: data.fullName }),
      ...(data.currentTitle && { title: data.currentTitle }),
      ...(data.currentCompany && { company: data.currentCompany }),
      ...(data.location && { location: data.location }),
      ...(data.industry && { industry: data.industry }),
      ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
      ...(data.profileImageUrl && { avatar: data.profileImageUrl }),
    };

    // Clean professional bio - only the professional summary, no additional fields
    if (data.professionalSummary) {
      backendData.bio = data.professionalSummary.trim();
    }

    // Add relational data
    if (data.workExperiences && Array.isArray(data.workExperiences)) {
      console.log('🔧 Processing workExperiences:', data.workExperiences);
      backendData.workExperiences = data.workExperiences.map(exp => {
        const experience: any = {
          company: exp.company || '',
          title: exp.title || '',
          location: exp.location || '',
          startDate: exp.startDate || '',
          isCurrentRole: exp.isCurrentRole || false,
          description: exp.description || '',
          achievements: exp.achievements || [],
          skills: exp.skills || []
        };
        
        // Only include endDate if it's not empty and not a current role
        if (exp.endDate && exp.endDate.trim() !== '' && !exp.isCurrentRole) {
          experience.endDate = exp.endDate;
        }
        
        return experience;
      });
      console.log('🔧 Transformed workExperiences for backend:', backendData.workExperiences);
    }

    if (data.education && Array.isArray(data.education)) {
      backendData.education = data.education.map(edu => {
        const education: any = {
          institution: edu.institution || '',
          degree: edu.degree || '',
          fieldOfStudy: edu.fieldOfStudy || '',
          location: edu.location || '',
          startYear: edu.startYear || '',
          isCurrentlyStudying: edu.isCurrentlyStudying || false,
          grade: edu.grade || '',
          description: edu.description || '',
          activities: edu.activities || []
        };
        
        // Only include endYear if it has a value and not currently studying
        if (edu.endYear && edu.endYear.trim() !== '' && !edu.isCurrentlyStudying) {
          education.endYear = edu.endYear;
        }
        
        return education;
      });
    }

    if (data.certifications && Array.isArray(data.certifications)) {
      console.log('🔧 Processing certifications:', data.certifications);
      backendData.certifications = data.certifications.map((cert, index) => {
        console.log(`🔧 Processing certification ${index}:`, cert);
        console.log(`🔧 expirationDate value:`, cert.expirationDate, 'type:', typeof cert.expirationDate);
        console.log(`🔧 neverExpires value:`, cert.neverExpires);
        
        const certification: any = {
          name: cert.name || '',
          issuingOrganization: cert.issuingOrganization || '',
          issueDate: cert.issueDate || '',
          credentialId: cert.credentialId || '',
          credentialUrl: cert.credentialUrl || '',
          neverExpires: cert.neverExpires || false,
          description: cert.description || '',
          skills: cert.skills || []
        };
        
        // Only include expirationDate if it has a value and cert doesn't never expire
        if (!cert.neverExpires && cert.expirationDate && cert.expirationDate.trim() !== '') {
          certification.expirationDate = cert.expirationDate;
          console.log(`🔧 Including expirationDate:`, certification.expirationDate);
        } else {
          console.log(`🔧 NOT including expirationDate (neverExpires: ${cert.neverExpires}, expirationDate: "${cert.expirationDate}")`);
        }
        
        console.log(`🔧 Final certification object:`, certification);
        return certification;
      });
      console.log('🔧 Final certifications array for backend:', backendData.certifications);
    }

    console.log('✅ Complete backend payload with relational data:', backendData);
    return backendData;
  }

  transformProfileToOnboarding(profile: ProfileData): OnboardingData {
    console.log('🔄 Transforming profile to onboarding format');
    console.log('📊 Profile data received:', profile);
    
    // Transform relational data to onboarding format
    const onboardingData = {
      fullName: profile.name || '',
      currentTitle: profile.title || '',
      currentCompany: profile.company || '',
      industry: profile.industry || '',
      yearsOfExperience: profile.yearsOfExperience || 0,
      location: profile.location || '',
      profileImageUrl: profile.avatar || '',
      professionalSummary: profile.bio?.split('[ONBOARDING_DATA]')[0]?.split('\n\nIndustry:')[0]?.trim() || 
        profile.bio?.split('[ONBOARDING_DATA]')[0]?.trim() || 
        profile.bio || '',
      specializations: profile.specializations || [],
      careerHighlights: profile.careerHighlights || '',
      skills: [], // Skills will be populated separately
      topSkills: profile.topSkills || [],
      workExperiences: profile.workExperiences || [],
      education: profile.education || [],
      certifications: profile.certifications || [],
      careerGoals: profile.careerGoals || [],
      professionalInterests: profile.professionalInterests || [],
    };
    
    console.log('✅ Transformed onboarding data from relational profile:', onboardingData);
    return onboardingData;
  }

  private transformBackendProfileToFrontend(backendData: any, skillsData: any[] = [], onboardingData: any = null): ProfileData {
    console.log('🔄 Transforming backend data to frontend format:', backendData);
    console.log('🔄 Skills data received:', skillsData);
    console.log('🔄 Onboarding data received:', onboardingData);
    
    // Clean up legacy bio that may have concatenated fields
    let cleanBio = backendData.bio || '';
    if (cleanBio) {
      // Remove concatenated Industry, Years of Experience, and Career Highlights
      cleanBio = cleanBio
        .replace(/\n\nIndustry:.*$/s, '') // Remove everything from "\n\nIndustry:" to end
        .replace(/\nIndustry:.*$/s, '')   // Remove everything from "\nIndustry:" to end
        .trim();
    }
    
    // Use stored onboarding data if available (most complete)
    let professionalInfo: any = {};
    if (onboardingData && Object.keys(onboardingData).length > 0) {
      console.log('✅ Using stored onboarding data');
      console.log('🔍 Stored onboarding data keys:', Object.keys(onboardingData));
      console.log('🔍 Stored data sample:', {
        professionalSummary: onboardingData.professionalSummary ? 'EXISTS' : 'MISSING',
        specializations: onboardingData.specializations?.length || 0,
        skills: onboardingData.skills?.length || 0,
        workExperiences: onboardingData.workExperiences?.length || 0,
        education: onboardingData.education?.length || 0,
        careerGoals: onboardingData.careerGoals?.length || 0,
        professionalInterests: onboardingData.professionalInterests?.length || 0
      });
      console.log('🔍 DEBUG careerGoals in onboardingData:', onboardingData.careerGoals);
      console.log('🔍 DEBUG professionalInterests in onboardingData:', onboardingData.professionalInterests);
      professionalInfo = onboardingData;
    } else {
      console.log('⚠️ No stored onboarding data available, using fallback logic');
    }
    
    // Extract professional info from bio field as fallback
    if (!professionalInfo.industry || !professionalInfo.yearsOfExperience) {
      if (backendData.bio) {
        const industryMatch = backendData.bio.match(/Industry:\s*([^\n]+)/);
        const experienceMatch = backendData.bio.match(/Years of Experience:\s*(\d+)/);
        const highlightsMatch = backendData.bio.match(/Career Highlights:\s*([^\n]+)/);
        
        if (industryMatch || experienceMatch || highlightsMatch) {
          professionalInfo = {
            ...professionalInfo,
            industry: professionalInfo.industry || (industryMatch ? industryMatch[1].trim() : ''),
            yearsOfExperience: professionalInfo.yearsOfExperience || (experienceMatch ? parseInt(experienceMatch[1]) : 0),
            careerHighlights: professionalInfo.careerHighlights || (highlightsMatch ? highlightsMatch[1].trim() : ''),
          };
          console.log('📄 Extracted professional info from bio:', professionalInfo);
        }
      }
    }

    // Extract skills and specializations from proper sources
    console.log('🔍 Extracting skills from multiple sources');
    
    // Get topSkills - prioritize stored onboarding data, fallback to API skills, then backend skills
    let topSkills = [];
    
    if (professionalInfo.topSkills && professionalInfo.topSkills.length > 0) {
      topSkills = professionalInfo.topSkills;
      console.log('🎯 Using onboarding topSkills:', topSkills);
    } else if (skillsData && skillsData.length > 0) {
      topSkills = skillsData
        .filter((skill: any) => skill.isVisible !== false)
        .map((skill: any) => skill.skill?.name || skill.skillName || skill.name)
        .filter(Boolean);
      
      if (topSkills.length === 0) {
        topSkills = skillsData
          .slice(0, 5)
          .map((skill: any) => skill.skill?.name || skill.skillName || skill.name)
          .filter(Boolean);
      }
      console.log('🎯 Using skills API data:', topSkills);
    } else if (backendData.skills && backendData.skills.length > 0) {
      topSkills = backendData.skills
        .slice(0, 5)
        .map((skill: any) => skill.skill?.name || skill.skillName || skill.name)
        .filter(Boolean);
      console.log('🎯 Using backend skills directly:', topSkills);
    }
    
    console.log('🎯 Final extracted topSkills:', topSkills);

    // Get specializations from onboarding data 
    const specializations = professionalInfo.specializations || [];
    
    // Get full skills array from onboarding data, API, or backend data
    let skills = [];
    
    if (professionalInfo.skills && professionalInfo.skills.length > 0) {
      skills = professionalInfo.skills;
      console.log('🛠️ Using onboarding skills array:', skills);
    } else if (skillsData && skillsData.length > 0) {
      skills = skillsData.map((skill: any) => ({
        name: skill.skill?.name || skill.skillName || skill.name,
        proficiency: skill.level || skill.proficiency || 'intermediate',
        category: skill.skill?.category || skill.category || 'Technical'
      })).filter(skill => skill.name);
      console.log('🛠️ Using skills API data:', skills);
    } else if (backendData.skills && backendData.skills.length > 0) {
      skills = backendData.skills.map((skill: any) => ({
        name: skill.skill?.name || skill.skillName || skill.name,
        proficiency: skill.level || skill.proficiency || 'intermediate',
        category: skill.skill?.category || skill.category || 'Technical'
      })).filter(skill => skill.name);
      console.log('🛠️ Using backend skills directly:', skills);
    }
    
    console.log('🛠️ Final extracted skills array:', skills);

    // Extract additional data fields from stored data OR backend data
    const workExperiences = professionalInfo.workExperiences || backendData.workExperiences || [];
    const education = professionalInfo.education || backendData.education || [];
    const certifications = professionalInfo.certifications || backendData.certifications || [];
    
    console.log('📊 Debug - extracted data lengths:', {
      workExperiences: workExperiences.length,
      education: education.length,
      certifications: certifications.length,
      backendWorkExp: backendData.workExperiences?.length || 0,
      backendEducation: backendData.education?.length || 0,
      backendCerts: backendData.certifications?.length || 0
    });
    
    // DEBUG: Check if goals/interests are in professionalInfo
    console.log('🔍 professionalInfo keys:', Object.keys(professionalInfo));
    console.log('🔍 professionalInfo careerGoals value:', professionalInfo.careerGoals);
    console.log('🔍 professionalInfo professionalInterests value:', professionalInfo.professionalInterests);
    
    const careerGoals = professionalInfo.careerGoals || [];
    const professionalInterests = professionalInfo.professionalInterests || [];

    console.log('⭐ Extracted topSkills:', topSkills);
    console.log('🎯 Extracted specializations:', specializations);
    console.log('💼 Extracted workExperiences:', workExperiences);
    console.log('🎓 Extracted education:', education);
    console.log('🏆 Extracted certifications:', certifications);
    console.log('🎯 Extracted careerGoals:', careerGoals);
    console.log('💜 Extracted professionalInterests:', professionalInterests);

    // Create complete onboarding data object for the profile
    const completeOnboardingData = professionalInfo && Object.keys(professionalInfo).length > 0 ? professionalInfo : {
      fullName: backendData.name || '',
      currentTitle: backendData.title || '',
      currentCompany: backendData.company || '',
      industry: professionalInfo.industry || '',
      yearsOfExperience: professionalInfo.yearsOfExperience || 0,
      location: backendData.location || '',
      profileImageUrl: this.getFullAvatarUrl(backendData.avatar || ''),
      professionalSummary: professionalInfo.professionalSummary || 
        (backendData.bio?.split('\n\nIndustry:')[0]?.trim()) || 
        backendData.bio || '',
      specializations: specializations,
      careerHighlights: professionalInfo.careerHighlights || '',
      skills: skills,
      topSkills: topSkills,
      workExperiences: workExperiences,
      education: education,
      certifications: certifications,
      careerGoals: careerGoals,
      professionalInterests: professionalInterests,
    };
    
    console.log('📦 Complete onboarding data created:', completeOnboardingData);

    // Prioritize professional summary from onboarding data over backend bio
    const finalBio = professionalInfo.professionalSummary || cleanBio || 'No bio available';
    console.log('🔍 Bio selection process:', {
      professionalSummary: professionalInfo.professionalSummary ? 'EXISTS' : 'MISSING',
      cleanBio: cleanBio ? 'EXISTS' : 'MISSING',
      finalBio: finalBio ? 'EXISTS' : 'MISSING'
    });

    // Prioritize onboarding data for basic profile fields
    const finalName = professionalInfo.fullName || backendData.name || 'No name provided';
    const finalTitle = professionalInfo.currentTitle || backendData.title || 'No title provided';
    const finalCompany = professionalInfo.currentCompany || backendData.company || 'No company provided';
    const finalLocation = professionalInfo.location || backendData.location || 'No location provided';
    
    console.log('🔍 Basic profile fields selection:', {
      name: { onboarding: professionalInfo.fullName || 'MISSING', backend: backendData.name || 'MISSING', final: finalName },
      title: { onboarding: professionalInfo.currentTitle || 'MISSING', backend: backendData.title || 'MISSING', final: finalTitle },
      company: { onboarding: professionalInfo.currentCompany || 'MISSING', backend: backendData.company || 'MISSING', final: finalCompany },
      location: { onboarding: professionalInfo.location || 'MISSING', backend: backendData.location || 'MISSING', final: finalLocation }
    });

    const transformed: ProfileData = {
      id: backendData.id || '',
      name: finalName,
      title: finalTitle,
      company: finalCompany,
      location: finalLocation,
      avatar: this.getFullAvatarUrl(professionalInfo.profileImageUrl || backendData.avatar || '/default-avatar.svg'),
      bio: finalBio,
      industry: professionalInfo.industry || backendData.industry || '',
      yearsOfExperience: professionalInfo.yearsOfExperience !== undefined ? professionalInfo.yearsOfExperience : (backendData.yearsOfExperience || 0),
      specializations: specializations,
      careerHighlights: professionalInfo.careerHighlights || '',
      topSkills: topSkills,
      careerGoals: careerGoals,
      professionalInterests: professionalInterests,
      workExperiences: workExperiences,
      education: education,
      certifications: certifications,
      onboardingData: {
        ...completeOnboardingData,
        // Ensure we have all the skills data available
        skills: skills,
        topSkills: topSkills,
        workExperiences: workExperiences,
        education: education,
        certifications: certifications
      }
    };

    console.log('✅ Transformed profile data:', transformed);
    return transformed;
  }
}

export const profileApiService = new ProfileApiService();