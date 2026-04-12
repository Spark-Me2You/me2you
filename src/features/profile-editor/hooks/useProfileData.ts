import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profileService';
import type { ProfileWithImage } from '../types/profileTypes';

export const useProfileData = () => {
  const [profileData, setProfileData] = useState<ProfileWithImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await profileService.getCurrentProfile();
      setProfileData(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch profile';
      setError(message);
      console.error('[useProfileData] Error fetching profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    isLoading,
    error,
    refetch: fetchProfile,
  };
};
