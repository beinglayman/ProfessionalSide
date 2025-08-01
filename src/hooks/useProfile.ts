// Production-ready profile hooks
import { useState, useCallback, useEffect } from 'react';
import { profileApiService, ProfileData } from '../services/profile-api.service';
import { OnboardingData } from '../services/onboarding.service';

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await profileApiService.getProfile();
      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      console.error('Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (data: Partial<OnboardingData>) => {
    try {
      setError(null);
      const updatedProfile = await profileApiService.updateProfile(data);
      setProfile(updatedProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}