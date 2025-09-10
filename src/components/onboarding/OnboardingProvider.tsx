import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OnboardingOverlayContextType, OnboardingOverlayState } from '../../types/onboarding-overlay';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingProviderProps {
  children: ReactNode;
}

const OnboardingOverlayContext = createContext<OnboardingOverlayContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingOverlayState>({
    isVisible: false,
    currentStep: 0,
    totalSteps: 3,
    isCompleted: false
  });

  // Load overlay completion state from localStorage and user data
  useEffect(() => {
    if (!user) return;

    const hasSeenOverlay = localStorage.getItem('hasSeenOnboardingOverlay');
    const userHasSeenOverlay = user?.hasSeenOnboardingOverlay;
    
    // If user hasn't seen overlay in database or localStorage, it can be shown
    const canShowOverlay = !userHasSeenOverlay && !hasSeenOverlay;
    
    setState(prev => ({
      ...prev,
      isCompleted: !canShowOverlay
    }));
  }, [user]);

  const showOverlay = () => {
    setState(prev => ({ ...prev, isVisible: true }));
  };

  const hideOverlay = () => {
    setState(prev => ({ ...prev, isVisible: false }));
  };

  const nextStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1)
    }));
  };

  const previousStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
  };

  const goToStep = (step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, prev.totalSteps - 1))
    }));
  };

  const skipOnboarding = () => {
    setState(prev => ({
      ...prev,
      isVisible: false,
      isCompleted: true
    }));

    // Save to localStorage
    localStorage.setItem('hasSeenOnboardingOverlay', 'true');

    // Update user in backend (optional - can be done later)
    updateUserOverlayStatus(true);
  };

  const completeOnboarding = () => {
    setState(prev => ({
      ...prev,
      isVisible: false,
      isCompleted: true,
      currentStep: prev.totalSteps - 1
    }));

    // Save to localStorage
    localStorage.setItem('hasSeenOnboardingOverlay', 'true');

    // Update user in backend
    updateUserOverlayStatus(true);
  };

  const updateUserOverlayStatus = async (hasSeenOverlay: boolean) => {
    try {
      // This would be an API call to update the user's hasSeenOnboardingOverlay status
      // For now, we'll just log it
      console.log('🎯 Onboarding overlay completed:', hasSeenOverlay);
      
      // TODO: Implement API call to update user.hasSeenOnboardingOverlay in backend
      // await apiClient.patch('/api/v1/users/me', { hasSeenOnboardingOverlay: hasSeenOverlay });
    } catch (error) {
      console.error('❌ Failed to update onboarding overlay status:', error);
    }
  };

  const contextValue: OnboardingOverlayContextType = {
    state,
    showOverlay,
    hideOverlay,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    goToStep
  };

  return (
    <OnboardingOverlayContext.Provider value={contextValue}>
      {children}
    </OnboardingOverlayContext.Provider>
  );
};

export const useOnboardingOverlay = (): OnboardingOverlayContextType => {
  const context = useContext(OnboardingOverlayContext);
  if (!context) {
    throw new Error('useOnboardingOverlay must be used within an OnboardingProvider');
  }
  return context;
};