// Mock API service for development/testing
// This simulates database operations until a real backend is implemented

import { OnboardingData } from './onboarding.service';

class MockApiService {
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async saveOnboardingData(userId: string, data: Partial<OnboardingData>): Promise<void> {
    // Simulate API delay
    await this.delay(100);
    
    console.log('🚀 MOCK API saveOnboardingData called');
    console.log('📝 User ID:', userId);
    console.log('📊 Data to save:', data);
    
    // Mock saving to database - in development, we'll still use localStorage
    const storageKey = `mock_onboarding_${userId}`;
    console.log('🔑 Storage key:', storageKey);
    
    const existing = localStorage.getItem(storageKey) || '{}';
    console.log('📂 Existing data from storage:', existing);
    
    const existingData = JSON.parse(existing);
    const updatedData = { ...existingData, ...data };
    
    console.log('=== MOCK API SAVING DATA ===');
    console.log('Existing data:', existingData);
    console.log('New data:', data);
    console.log('Updated data:', updatedData);
    console.log('Basic fields in updated data:', {
      fullName: updatedData.fullName,
      currentTitle: updatedData.currentTitle,
      currentCompany: updatedData.currentCompany,
      location: updatedData.location,
      profileImageUrl: updatedData.profileImageUrl
    });
    
    const serializedData = JSON.stringify(updatedData);
    console.log('💾 Serialized data to store:', serializedData);
    
    localStorage.setItem(storageKey, serializedData);
    console.log('✅ Mock API: Saved onboarding data to mock database');
    
    // Double-check it was saved
    const verifyData = localStorage.getItem(storageKey);
    console.log('🔍 Verification - data actually stored:', verifyData);
  }

  async getOnboardingData(userId: string): Promise<OnboardingData | null> {
    // Simulate API delay
    await this.delay(50);
    
    const data = localStorage.getItem(`mock_onboarding_${userId}`);
    const result = data ? JSON.parse(data) : null;
    console.log('Mock API: Retrieved onboarding data from mock database');
    return result;
  }

  async saveStepData(userId: string, stepId: string, stepData: any): Promise<void> {
    // Simulate API delay
    await this.delay(80);
    
    const existing = localStorage.getItem(`mock_onboarding_${userId}`) || '{}';
    const existingData = JSON.parse(existing);
    const updatedData = { ...existingData, ...stepData };
    
    localStorage.setItem(`mock_onboarding_${userId}`, JSON.stringify(updatedData));
    console.log(`Mock API: Saved step ${stepId} data to mock database`);
  }

  async isOnboardingComplete(userId: string): Promise<boolean> {
    // Simulate API delay
    await this.delay(30);
    
    const data = await this.getOnboardingData(userId);
    const isComplete = data !== null && 
                      data.fullName && 
                      data.currentTitle && 
                      data.professionalSummary && 
                      data.skills && data.skills.length > 0;
                      
    console.log('Mock API: Checked onboarding completion status');
    return isComplete;
  }

  async markOnboardingComplete(userId: string): Promise<void> {
    // Simulate API delay
    await this.delay(100);
    
    localStorage.setItem(`mock_onboarding_complete_${userId}`, 'true');
    console.log('Mock API: Marked onboarding as complete');
  }

  async getCurrentStep(userId: string): Promise<number> {
    // Simulate API delay
    await this.delay(40);
    
    const data = await this.getOnboardingData(userId);
    if (!data) return 0;
    
    let targetStep = 0;
    if (data.fullName && data.currentTitle) targetStep = Math.max(targetStep, 1);
    if (data.professionalSummary) targetStep = Math.max(targetStep, 2);
    if (data.skills?.length > 0) targetStep = Math.max(targetStep, 3);
    if (data.workExperiences?.length > 0) targetStep = Math.max(targetStep, 4);
    if (data.education?.length > 0) targetStep = Math.max(targetStep, 5);
    if (data.certifications?.length > 0) targetStep = Math.max(targetStep, 6);
    
    console.log(`Mock API: Calculated current step as ${targetStep}`);
    return targetStep;
  }

  async saveCurrentStep(userId: string, step: number): Promise<void> {
    // Simulate API delay
    await this.delay(60);
    
    localStorage.setItem(`mock_current_step_${userId}`, step.toString());
    console.log(`Mock API: Saved current step ${step}`);
  }

  async clearOnboardingData(userId: string): Promise<void> {
    // Simulate API delay
    await this.delay(100);
    
    localStorage.removeItem(`mock_onboarding_${userId}`);
    localStorage.removeItem(`mock_onboarding_complete_${userId}`);
    localStorage.removeItem(`mock_current_step_${userId}`);
    console.log('Mock API: Cleared all onboarding data');
  }

  async uploadProfileImage(userId: string, file: File): Promise<string> {
    // Simulate API delay
    await this.delay(200);
    
    // In a real app, this would upload to a cloud storage service
    // For now, we'll convert to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log('Mock API: Uploaded profile image (converted to data URL)');
        resolve(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }
}

export const mockApiService = new MockApiService();