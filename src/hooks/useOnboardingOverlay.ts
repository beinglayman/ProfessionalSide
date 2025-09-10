import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseOnboardingOverlayReturn {
  shouldShowOverlay: boolean;
  showOverlay: () => void;
  hideOverlay: () => void;
  completeOverlay: () => void;
  skipOverlay: () => void;
  hasSeenOverlay: boolean;
}

export const useOnboardingOverlay = (): UseOnboardingOverlayReturn => {
  const { user } = useAuth();
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
  const [hasSeenOverlay, setHasSeenOverlay] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check localStorage for overlay completion
    const localStorageFlag = localStorage.getItem('hasSeenOnboardingOverlay');
    
    // Check user database flag (when available)
    const userHasSeenOverlay = user?.hasSeenOnboardingOverlay;
    
    const overlayCompleted = Boolean(localStorageFlag) || Boolean(userHasSeenOverlay);
    
    setHasSeenOverlay(overlayCompleted);
    
    // Don't show overlay if already completed
    if (overlayCompleted) {
      setShouldShowOverlay(false);
      return;
    }

    // Check if user has completed initial onboarding
    // This would typically come from the user's profile or onboarding data
    const hasCompletedInitialOnboarding = checkInitialOnboardingStatus(user);
    
    if (hasCompletedInitialOnboarding) {
      // Show overlay on first profile page visit after onboarding completion
      const shouldShow = shouldShowOnboardingOverlay(user);
      setShouldShowOverlay(shouldShow);
    }
  }, [user]);

  const showOverlay = () => {
    setShouldShowOverlay(true);
  };

  const hideOverlay = () => {
    setShouldShowOverlay(false);
  };

  const completeOverlay = () => {
    setShouldShowOverlay(false);
    setHasSeenOverlay(true);
    
    // Save to localStorage
    localStorage.setItem('hasSeenOnboardingOverlay', 'true');
    
    // TODO: Update user in backend
    updateUserOverlayStatus(true);
  };

  const skipOverlay = () => {
    setShouldShowOverlay(false);
    setHasSeenOverlay(true);
    
    // Save to localStorage
    localStorage.setItem('hasSeenOnboardingOverlay', 'true');
    
    // TODO: Update user in backend
    updateUserOverlayStatus(true);
  };

  return {
    shouldShowOverlay,
    showOverlay,
    hideOverlay,
    completeOverlay,
    skipOverlay,
    hasSeenOverlay
  };
};

// Helper function to check if user has completed OR skipped initial onboarding
function checkInitialOnboardingStatus(user: any): boolean {
  // Check for explicit onboarding completion OR skip flag
  return Boolean(
    user?.onboardingCompleted || 
    user?.onboardingSkipped ||
    localStorage.getItem('initialOnboardingSkipped') ||
    localStorage.getItem('onboardingCompleted') ||
    // Fallback: if user has basic profile info, assume they completed onboarding
    (user?.name && user?.email && (user?.title || user?.company))
  );
}

// Helper function to determine if overlay should be shown
function shouldShowOnboardingOverlay(user: any): boolean {
  // Show overlay if:
  // 1. User has not seen it before
  // 2. User is on their first visit to profile page after onboarding
  // 3. User has completed initial 7-step onboarding OR clicked "Skip for now"
  
  const hasSeenOverlay = localStorage.getItem('hasSeenOnboardingOverlay');
  if (hasSeenOverlay) return false;
  
  // Check if user has database flag
  if (user?.hasSeenOnboardingOverlay) return false;
  
  // For now, show to all users who haven't seen it
  // In production, you might want additional conditions
  return true;
}

// Helper function to update user overlay status in backend
async function updateUserOverlayStatus(hasSeenOverlay: boolean): Promise<void> {
  try {
    // TODO: Implement API call to update user.hasSeenOnboardingOverlay
    console.log('🎯 Updating user onboarding overlay status:', hasSeenOverlay);
    
    // This would be something like:
    // await apiClient.patch('/api/v1/users/me', { hasSeenOnboardingOverlay: hasSeenOverlay });
    
  } catch (error) {
    console.error('❌ Failed to update onboarding overlay status:', error);
  }
}