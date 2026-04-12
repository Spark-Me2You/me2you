/**
 * useRegistration Hook
 * Manages multi-step registration flow state
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/core/supabase/client';
import { userRegistrationAuthService } from '@/core/supabase/userRegistrationAuth';
import { registrationService, type RegistrationFormData, type RegistrationResult } from '../services/registrationService';

/**
 * Registration steps
 */
export type RegistrationStep = 'signup' | 'profile' | 'photo' | 'success';

/**
 * Registration state
 */
export interface RegistrationState {
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  isSubmitting: boolean;
  uploadProgress: number; // 0-100
  error: string | null;
  result: RegistrationResult | null;
}

/**
 * useRegistration return type
 */
export interface UseRegistrationReturn {
  // State
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  isSubmitting: boolean;
  uploadProgress: number;
  error: string | null;
  result: RegistrationResult | null;

  // Step navigation
  goToStep: (step: RegistrationStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Form data
  updateFormData: (data: Partial<RegistrationFormData>) => void;
  clearError: () => void;

  // Step handlers
  handleSignUp: (email: string, password: string) => Promise<boolean>;
  handleProfileSubmit: () => Promise<boolean>;
  handlePhotoSubmit: (original: Blob, cropped: Blob, category: string) => Promise<boolean>;
}

const STEP_ORDER: RegistrationStep[] = ['signup', 'profile', 'photo', 'success'];

/**
 * Custom hook for managing registration flow
 */
export const useRegistration = (): UseRegistrationReturn => {
  const { signUpUser, setUserProfile } = useAuth();

  const [state, setState] = useState<RegistrationState>({
    currentStep: 'signup',
    formData: {},
    isSubmitting: false,
    uploadProgress: 0,
    error: null,
    result: null,
  });

  const goToStep = useCallback((step: RegistrationStep) => {
    setState(prev => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setState(prev => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex + 1],
        error: null,
      }));
    }
  }, [state.currentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex - 1],
        error: null,
      }));
    }
  }, [state.currentStep]);

  const isFirstStep = state.currentStep === STEP_ORDER[0];
  const isLastStep = state.currentStep === STEP_ORDER[STEP_ORDER.length - 1];

  const updateFormData = useCallback((data: Partial<RegistrationFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      await signUpUser(email, password);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        formData: { ...prev.formData, email, password },
      }));
      nextStep();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      setState(prev => ({ ...prev, isSubmitting: false, error: message }));
      return false;
    }
  }, [signUpUser, nextStep]);

  const handlePhotoSubmit = useCallback(async (original: Blob, cropped: Blob, category: string): Promise<boolean> => {
    if (!original || !cropped) {
      setState(prev => ({ ...prev, error: 'Please take a photo' }));
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { name, status, pronouns, major, interests } = state.formData;
      if (!name || name.trim() === '') throw new Error('Name is required');

      const profile = await registrationService.createProfile({
        name: name.trim(),
        status: status?.trim() || null,
        pronouns: pronouns?.trim() || null,
        major: major?.trim() || null,
        interests: interests || null,
      });

      setUserProfile(profile);

      setState(prev => ({
        ...prev,
        result: {
          user,
          profile,
          imageId: undefined,
        },
      }));
      nextStep();

      // Upload both original and cropped photos in background
      registrationService.uploadPhotosAndCreateRecord(
        original,
        cropped,
        user.id,
        category,
        async (_dbInsertedImageId) => {
          // Sign out after upload completes
          await userRegistrationAuthService.signOut();
        },
        (progress) => {
          setState(prev => ({ ...prev, uploadProgress: progress }));
        }
      ).catch((err) => {
        console.error('[handlePhotoSubmit] Background upload failed:', err);
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process photo';
      setState(prev => ({ ...prev, error: message }));
      return false;
    }
  }, [state.formData, setUserProfile, nextStep]);

  const handleProfileSubmit = useCallback(async (): Promise<boolean> => {
    const { name } = state.formData;

    if (!name || name.trim() === '') {
      setState(prev => ({ ...prev, error: 'Name is required' }));
      return false;
    }

    nextStep();
    return true;
  }, [state.formData, nextStep]);

  return {
    currentStep: state.currentStep,
    formData: state.formData,
    isSubmitting: state.isSubmitting,
    uploadProgress: state.uploadProgress,
    error: state.error,
    result: state.result,
    goToStep,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,
    updateFormData,
    clearError,
    handleSignUp,
    handleProfileSubmit,
    handlePhotoSubmit,
  };
};